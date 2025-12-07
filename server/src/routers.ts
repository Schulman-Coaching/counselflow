import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";

export const appRouter = router({
  documentComments: router({
    create: protectedProcedure
      .input(
        z.object({
          documentId: z.number(),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const commentId = await db.createDocumentComment({
          documentId: input.documentId,
          userId: ctx.user.id,
          clientId: null,
          authorName: ctx.user.name || ctx.user.email || "Attorney",
          authorType: "attorney",
          content: input.content,
        });
        return { id: commentId };
      }),
    list: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentComments(input.documentId);
      }),
    delete: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const comments = await db.getDocumentComments(0);
        const comment = comments.find((c: any) => c.id === input.commentId);
        if (comment && comment.userId === ctx.user.id) {
          await db.deleteDocumentComment(input.commentId);
        }
        return { success: true };
      }),
  }),
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ Client Portal ============
  clientPortal: router({
    // Verify token and get client info
    verify: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const client = await db.getClientByToken(input.token);
        if (!client || !client.portalEnabled) {
          throw new Error("Invalid or disabled portal access");
        }
        await db.updateClientPortalAccess(client.id);
        return {
          id: client.id,
          name: client.name,
          email: client.email,
          phoneNumber: client.phoneNumber,
        };
      }),

    // Get client's matters
    matters: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const client = await db.getClientByToken(input.token);
        if (!client || !client.portalEnabled) {
          throw new Error("Invalid or disabled portal access");
        }
        return await db.getMattersByClientId(client.id);
      }),

    // Get client's documents
    documents: publicProcedure
      .input(z.object({ token: z.string(), matterId: z.number().optional() }))
      .query(async ({ input }) => {
        const client = await db.getClientByToken(input.token);
        if (!client || !client.portalEnabled) {
          throw new Error("Invalid or disabled portal access");
        }
        
        if (input.matterId) {
          // Verify matter belongs to client
          const matter = await db.getMatterById(input.matterId);
          if (!matter || matter.clientId !== client.id) {
            throw new Error("Access denied");
          }
          return await db.getDocumentsByMatterId(input.matterId);
        }
        
        // Get all documents for all client's matters
        const matters = await db.getMattersByClientId(client.id);
        const allDocs = [];
        for (const matter of matters) {
          const docs = await db.getDocumentsByMatterId(matter.id);
          allDocs.push(...docs);
        }
        return allDocs;
      }),

    // Get client's invoices
    invoices: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const client = await db.getClientByToken(input.token);
        if (!client || !client.portalEnabled) {
          throw new Error("Invalid or disabled portal access");
        }
        return await db.getInvoicesByClientId(client.id);
      }),

    // Upload document
    uploadDocument: publicProcedure
      .input(z.object({
        token: z.string(),
        matterId: z.number(),
        title: z.string(),
        fileData: z.string(), // base64 encoded file
        fileName: z.string(),
        fileType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const client = await db.getClientByToken(input.token);
        if (!client || !client.portalEnabled) {
          throw new Error("Invalid or disabled portal access");
        }

        // Verify matter belongs to client
        const matter = await db.getMatterById(input.matterId);
        if (!matter || matter.clientId !== client.id) {
          throw new Error("Access denied");
        }

        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, 'base64');
        
        // Upload to S3
        const fileKey = `client-uploads/${client.id}/${input.matterId}/${Date.now()}-${input.fileName}`;
        const { storagePut } = await import('./storage');
        const { url } = await storagePut(fileKey, fileBuffer, input.fileType);

        // Create document record
        const documentId = await db.createDocument({
          userId: matter.userId,
          matterId: input.matterId,
          templateId: null,
          title: input.title,
          content: `Client uploaded: ${input.fileName}`,
          fileUrl: url,
          fileKey: fileKey,
          version: 1,
          status: 'draft',
        });

        // Log activity
        await db.logActivity({
          userId: matter.userId,
          entityType: 'document',
          entityId: documentId,
          action: 'client_upload',
          details: JSON.stringify({
            clientId: client.id,
            clientName: client.name,
            fileName: input.fileName,
            matterId: input.matterId,
          }),
        });

        return { id: documentId, url };
      }),
    
    // Client comment on document
    addComment: publicProcedure
      .input(z.object({
        token: z.string(),
        documentId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const client = await db.getClientByToken(input.token);
        if (!client || !client.portalEnabled) {
          throw new Error("Invalid or disabled portal access");
        }
        
        const commentId = await db.createDocumentComment({
          documentId: input.documentId,
          userId: null,
          clientId: client.id,
          authorName: client.name,
          authorType: "client",
          content: input.content,
        });
        return { id: commentId };
      }),
    
    // Get comments for document
    getComments: publicProcedure
      .input(z.object({
        token: z.string(),
        documentId: z.number(),
      }))
      .query(async ({ input }) => {
        const client = await db.getClientByToken(input.token);
        if (!client || !client.portalEnabled) {
          throw new Error("Invalid or disabled portal access");
        }
        
        return await db.getDocumentComments(input.documentId);
      }),
  }),

  // ============ Client Management ============
  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getClientsByUserId(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getClientById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email().optional(),
        phoneNumber: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const clientId = await db.createClient({
          userId: ctx.user.id,
          name: input.name,
          email: input.email,
          phoneNumber: input.phoneNumber,
          address: input.address,
          notes: input.notes,
          status: "lead",
        });
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "client",
          entityId: clientId,
          action: "created",
          details: JSON.stringify({ name: input.name }),
        });
        
        return { id: clientId };
      }),
    
    enablePortal: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(32);
        await db.enableClientPortal(input.clientId, token);
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "client",
          entityId: input.clientId,
          action: "portal_enabled",
          details: JSON.stringify({ token }),
        });
        
        return { token };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phoneNumber: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(["lead", "active", "inactive", "archived"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateClient(id, updates);
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "client",
          entityId: id,
          action: "updated",
          details: JSON.stringify(updates),
        });
        
        return { success: true };
      }),
  }),

  // ============ Matter Management ============
  matters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getMattersByUserId(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getMatterById(input.id);
      }),
    
    getByClient: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMattersByClientId(input.clientId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        caseType: z.string(),
        billingType: z.enum(["hourly", "flat_fee", "contingency"]),
        hourlyRate: z.number().optional(),
        flatFeeAmount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const matterId = await db.createMatter({
          userId: ctx.user.id,
          clientId: input.clientId,
          title: input.title,
          description: input.description,
          caseType: input.caseType,
          status: "open",
          billingType: input.billingType,
          hourlyRate: input.hourlyRate,
          flatFeeAmount: input.flatFeeAmount,
        });
        
        // Update client status to active
        await db.updateClient(input.clientId, { status: "active" });
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "matter",
          entityId: matterId,
          action: "created",
          details: JSON.stringify({ title: input.title, clientId: input.clientId }),
        });
        
        return { id: matterId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["open", "pending", "closed", "archived"]).optional(),
        closingDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateMatter(id, updates);
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "matter",
          entityId: id,
          action: "updated",
          details: JSON.stringify(updates),
        });
        
        return { success: true };
      }),
  }),

  // ============ Intake Forms ============
  intake: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getIntakeFormsByUserId(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getIntakeFormById(input.id);
      }),
    
    submit: publicProcedure
      .input(z.object({
        lawyerId: z.number(),
        formData: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        // AI Analysis of intake form
        const aiResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a legal assistant analyzing client intake forms. Provide: 1) Case type classification, 2) Urgency assessment (true/false), 3) Estimated case value (low/medium/high), 4) Key concerns, 5) Recommended next steps."
            },
            {
              role: "user",
              content: `Analyze this intake form: ${JSON.stringify(input.formData)}`
            }
          ],
        });
        
        const aiAnalysis = typeof aiResponse.choices[0]?.message?.content === 'string' 
          ? aiResponse.choices[0].message.content 
          : "";
        
        // Simple conflict check (check if client name exists)
        const clientName = input.formData.name as string;
        const existingClients = await db.getClientsByUserId(input.lawyerId);
        const hasConflict = existingClients.some(c => 
          c.name.toLowerCase().includes(clientName.toLowerCase())
        );
        
        const formId = await db.createIntakeForm({
          userId: input.lawyerId,
          formData: JSON.stringify(input.formData),
          aiAnalysis,
          urgencyFlag: aiAnalysis.toLowerCase().includes("urgent") || aiAnalysis.toLowerCase().includes("deadline"),
          conflictCheckResult: hasConflict ? "Potential conflict detected" : "No conflicts found",
          status: "new",
        });
        
        return { 
          id: formId, 
          aiAnalysis,
          hasConflict,
        };
      }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "reviewed", "converted", "rejected"]),
        clientId: z.number().optional(),
        matterId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateIntakeForm(id, updates);
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "intake",
          entityId: id,
          action: "status_updated",
          details: JSON.stringify(updates),
        });
        
        return { success: true };
      }),
  }),

  // ============ Document Management ============
  documents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDocumentsByUserId(ctx.user.id);
    }),
    
    getByMatter: protectedProcedure
      .input(z.object({ matterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentsByMatterId(input.matterId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentById(input.id);
      }),
    
    generate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        matterId: z.number().optional(),
        title: z.string(),
        answers: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getDocumentTemplateById(input.templateId);
        if (!template) {
          throw new Error("Template not found");
        }
        
        // Use AI to generate document from template and answers
        const aiResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a legal document drafting assistant. Generate a complete legal document based on the template and provided answers. Maintain professional legal language and proper formatting."
            },
            {
              role: "user",
              content: `Template: ${template.templateContent}\n\nAnswers: ${JSON.stringify(input.answers)}\n\nGenerate the complete document.`
            }
          ],
        });
        
        const content = typeof aiResponse.choices[0]?.message?.content === 'string' 
          ? aiResponse.choices[0].message.content 
          : "";
        
        const docId = await db.createDocument({
          userId: ctx.user.id,
          matterId: input.matterId,
          templateId: input.templateId,
          title: input.title,
          content,
          status: "draft",
          version: 1,
        });
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "document",
          entityId: docId,
          action: "generated",
          details: JSON.stringify({ templateId: input.templateId, title: input.title }),
        });
        
        return { id: docId, content };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().optional(),
        status: z.enum(["draft", "final", "archived"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateDocument(id, updates);
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "document",
          entityId: id,
          action: "updated",
          details: JSON.stringify(updates),
        });
        
        return { success: true };
      }),

    exportPDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { generateDocumentPDF } = await import("./services/pdfGenerator");
        const { storagePut } = await import("./storage");

        // Get document with related data
        const document = await db.getDocumentById(input.id);
        if (!document) {
          throw new Error("Document not found");
        }

        // Get matter and client info if available
        let matterTitle: string | undefined;
        let clientName: string | undefined;

        if (document.matterId) {
          const matter = await db.getMatterById(document.matterId);
          if (matter) {
            matterTitle = matter.title;
            const client = await db.getClientById(matter.clientId);
            if (client) {
              clientName = client.name;
            }
          }
        }

        // Prepare document data for PDF generation
        const documentData = {
          title: document.title,
          content: document.content || "",
          status: document.status || "draft",
          version: document.version || 1,
          matterTitle,
          clientName,
          lawyerName: ctx.user.name || "Attorney",
          createdAt: document.createdAt,
        };

        // Generate PDF
        const pdfBuffer = await generateDocumentPDF(documentData);

        // Upload to storage
        const fileName = `document-${document.title.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.pdf`;
        const { url } = await storagePut(
          `documents/${ctx.user.id}/${fileName}`,
          pdfBuffer,
          "application/pdf"
        );

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "document",
          entityId: document.id,
          action: "exported_pdf",
          details: JSON.stringify({ fileName, url }),
        });

        return { url, fileName };
      }),
  }),

  // ============ Document Templates ============
  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDocumentTemplates(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentTemplateById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.string(),
        state: z.string().optional(),
        templateContent: z.string(),
        questionnaireSchema: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const templateId = await db.createDocumentTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          category: input.category,
          state: input.state,
          templateContent: input.templateContent,
          questionnaireSchema: input.questionnaireSchema,
          isPublic: false,
        });

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "template",
          entityId: templateId,
          action: "created",
          details: JSON.stringify({ name: input.name, category: input.category }),
        });

        return { id: templateId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        state: z.string().optional(),
        templateContent: z.string().optional(),
        questionnaireSchema: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateDocumentTemplate(id, updates);

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "template",
          entityId: id,
          action: "updated",
          details: JSON.stringify(updates),
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDocumentTemplate(input.id);

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "template",
          entityId: input.id,
          action: "deleted",
        });

        return { success: true };
      }),
  }),

  // ============ Clause Library ============
  clauses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getClausesByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        content: z.string(),
        category: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const clauseId = await db.createClause({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          category: input.category,
          tags: input.tags,
        });
        
        return { id: clauseId };
      }),
  }),

  // ============ Time Tracking ============
  timeEntries: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTimeEntriesByUserId(ctx.user.id);
    }),
    
    getByMatter: protectedProcedure
      .input(z.object({ matterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTimeEntriesByMatterId(input.matterId);
      }),
    
    getUnbilled: protectedProcedure
      .input(z.object({ matterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getUnbilledTimeEntries(input.matterId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        matterId: z.number(),
        description: z.string(),
        durationMinutes: z.number(),
        hourlyRate: z.number().optional(),
        isBillable: z.boolean().default(true),
        entryDate: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate AI-enhanced billing narrative
        const aiResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a legal billing specialist. Convert the brief time entry description into a professional, detailed billing narrative suitable for client invoices. Be specific and use proper legal terminology."
            },
            {
              role: "user",
              content: `Time entry: ${input.description} (${input.durationMinutes} minutes)`
            }
          ],
        });
        
        const aiNarrative = typeof aiResponse.choices[0]?.message?.content === 'string' 
          ? aiResponse.choices[0].message.content 
          : input.description;
        
        const entryId = await db.createTimeEntry({
          userId: ctx.user.id,
          matterId: input.matterId,
          description: input.description,
          aiNarrative,
          durationMinutes: input.durationMinutes,
          hourlyRate: input.hourlyRate,
          isBillable: input.isBillable,
          isInvoiced: false,
          entryDate: input.entryDate,
        });
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "time_entry",
          entityId: entryId,
          action: "created",
          details: JSON.stringify({ matterId: input.matterId, minutes: input.durationMinutes }),
        });
        
        return { id: entryId, aiNarrative };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        aiNarrative: z.string().optional(),
        durationMinutes: z.number().optional(),
        isBillable: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateTimeEntry(id, updates);
        
        return { success: true };
      }),
  }),

  // ============ Invoicing ============
  invoices: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "all"]).optional(),
        clientId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const allInvoices = await db.getInvoicesByUserId(ctx.user.id);
        
        let filtered = allInvoices;
        
        // Filter by status
        if (input?.status && input.status !== "all") {
          filtered = filtered.filter(inv => inv.status === input.status);
        }
        
        // Filter by client
        if (input?.clientId) {
          filtered = filtered.filter(inv => inv.clientId === input.clientId);
        }
        
        return filtered;
      }),
    
    getByMatter: protectedProcedure
      .input(z.object({ matterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInvoicesByMatterId(input.matterId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getInvoiceById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        matterId: z.number(),
        clientId: z.number(),
        timeEntryIds: z.array(z.number()),
        dueDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Calculate total from time entries
        let totalAmount = 0;
        for (const entryId of input.timeEntryIds) {
          const entries = await db.getTimeEntriesByMatterId(input.matterId);
          const entry = entries.find(e => e.id === entryId);
          if (entry && entry.isBillable && entry.hourlyRate) {
            totalAmount += (entry.durationMinutes / 60) * entry.hourlyRate;
          }
        }
        
        const invoiceNumber = `INV-${Date.now()}-${nanoid(6)}`;
        
        const invoiceId = await db.createInvoice({
          userId: ctx.user.id,
          matterId: input.matterId,
          clientId: input.clientId,
          invoiceNumber,
          totalAmount: Math.round(totalAmount),
          status: "draft",
          dueDate: input.dueDate,
          notes: input.notes,
        });
        
        // Mark time entries as invoiced
        for (const entryId of input.timeEntryIds) {
          await db.updateTimeEntry(entryId, { isInvoiced: true, invoiceId });
        }
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "invoice",
          entityId: invoiceId,
          action: "created",
          details: JSON.stringify({ invoiceNumber, totalAmount }),
        });
        
        return { id: invoiceId, invoiceNumber };
      }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
        paidDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateInvoice(id, updates);
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "invoice",
          entityId: id,
          action: "status_updated",
          details: JSON.stringify(updates),
        });
        
        return { success: true };
      }),
    
    exportPDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { generateInvoicePDF } = await import("./services/pdfGenerator");
        const { storagePut } = await import("./storage");
        
        // Get invoice with all related data
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) {
          throw new Error("Invoice not found");
        }
        
        const client = await db.getClientById(invoice.clientId);
        const matter = await db.getMatterById(invoice.matterId);
        const allTimeEntries = await db.getTimeEntriesByMatterId(invoice.matterId);
        const timeEntries = allTimeEntries.filter(entry => entry.invoiceId === invoice.id);
        
        // Prepare invoice data
        const invoiceData = {
          ...invoice,
          clientName: client?.name || "Unknown Client",
          clientEmail: client?.email || undefined,
          matterTitle: matter?.title || "Unknown Matter",
          timeEntries: timeEntries.map((entry) => ({
            description: entry.description,
            aiNarrative: entry.aiNarrative || undefined,
            durationMinutes: entry.durationMinutes,
            hourlyRate: entry.hourlyRate || 0,
            entryDate: entry.entryDate,
          })),
          lawyerName: ctx.user.name || "Law Firm",
          lawyerEmail: ctx.user.email || undefined,
        };
        
        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);
        
        // Upload to S3
        const fileName = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`;
        const { url } = await storagePut(
          `invoices/${ctx.user.id}/${fileName}`,
          pdfBuffer,
          "application/pdf"
        );
        
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "invoice",
          entityId: invoice.id,
          action: "exported_pdf",
          details: JSON.stringify({ fileName, url }),
        });
        
        return { url, fileName };
      }),
  }),

  // ============ Payments ============
  payments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPaymentsByUserId(ctx.user.id);
    }),

    getByInvoice: protectedProcedure
      .input(z.object({ invoiceId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPaymentsByInvoiceId(input.invoiceId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPaymentById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        invoiceId: z.number(),
        amount: z.number(),
        paymentMethod: z.enum(["cash", "check", "credit_card", "bank_transfer", "other"]),
        referenceNumber: z.string().optional(),
        notes: z.string().optional(),
        paymentDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify invoice exists and belongs to user
        const invoice = await db.getInvoiceById(input.invoiceId);
        if (!invoice || invoice.userId !== ctx.user.id) {
          throw new Error("Invoice not found");
        }

        const paymentId = await db.createPayment({
          userId: ctx.user.id,
          invoiceId: input.invoiceId,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber,
          notes: input.notes,
          paymentDate: input.paymentDate || new Date(),
        });

        // Check if invoice is fully paid
        const totalPayments = await db.getTotalPaymentsByInvoiceId(input.invoiceId);
        if (totalPayments >= invoice.totalAmount) {
          await db.updateInvoice(input.invoiceId, {
            status: "paid",
            paidDate: new Date()
          });
        }

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "payment",
          entityId: paymentId,
          action: "created",
          details: JSON.stringify({ invoiceId: input.invoiceId, amount: input.amount }),
        });

        return { id: paymentId };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const payment = await db.getPaymentById(input.id);
        if (!payment || payment.userId !== ctx.user.id) {
          throw new Error("Payment not found");
        }

        await db.deletePayment(input.id);

        // Re-check invoice status after payment deletion
        const totalPayments = await db.getTotalPaymentsByInvoiceId(payment.invoiceId);
        const invoice = await db.getInvoiceById(payment.invoiceId);
        if (invoice && totalPayments < invoice.totalAmount && invoice.status === "paid") {
          await db.updateInvoice(payment.invoiceId, { status: "sent", paidDate: null });
        }

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "payment",
          entityId: input.id,
          action: "deleted",
        });

        return { success: true };
      }),

    getInvoiceBalance: protectedProcedure
      .input(z.object({ invoiceId: z.number() }))
      .query(async ({ input }) => {
        const invoice = await db.getInvoiceById(input.invoiceId);
        if (!invoice) {
          throw new Error("Invoice not found");
        }
        const totalPayments = await db.getTotalPaymentsByInvoiceId(input.invoiceId);
        return {
          totalAmount: invoice.totalAmount,
          totalPaid: totalPayments,
          balance: invoice.totalAmount - totalPayments,
        };
      }),
  }),

  // ============ Payment Reminders ============
  paymentReminders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPendingPaymentReminders(ctx.user.id);
    }),

    getByInvoice: protectedProcedure
      .input(z.object({ invoiceId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPaymentRemindersByInvoiceId(input.invoiceId);
      }),

    create: protectedProcedure
      .input(z.object({
        invoiceId: z.number(),
        reminderDate: z.date(),
        reminderType: z.enum(["upcoming", "due", "overdue", "custom"]),
        message: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const reminderId = await db.createPaymentReminder({
          userId: ctx.user.id,
          invoiceId: input.invoiceId,
          reminderDate: input.reminderDate,
          reminderType: input.reminderType,
          message: input.message,
        });

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "paymentReminder",
          entityId: reminderId,
          action: "created",
          details: JSON.stringify({ invoiceId: input.invoiceId, reminderDate: input.reminderDate }),
        });

        return { id: reminderId };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePaymentReminder(input.id);

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "paymentReminder",
          entityId: input.id,
          action: "deleted",
        });

        return { success: true };
      }),

    markAsSent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markReminderAsSent(input.id);
        return { success: true };
      }),

    getOverdueInvoices: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOverdueInvoices(ctx.user.id);
    }),

    // Auto-create reminders for an invoice based on due date
    autoCreateReminders: protectedProcedure
      .input(z.object({ invoiceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const invoice = await db.getInvoiceById(input.invoiceId);
        if (!invoice || !invoice.dueDate) {
          throw new Error("Invoice not found or has no due date");
        }

        const dueDate = new Date(invoice.dueDate);
        const reminders: Array<{ date: Date; type: "upcoming" | "due" | "overdue" }> = [];

        // 7 days before due
        const sevenDaysBefore = new Date(dueDate);
        sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
        if (sevenDaysBefore > new Date()) {
          reminders.push({ date: sevenDaysBefore, type: "upcoming" });
        }

        // 3 days before due
        const threeDaysBefore = new Date(dueDate);
        threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
        if (threeDaysBefore > new Date()) {
          reminders.push({ date: threeDaysBefore, type: "upcoming" });
        }

        // On due date
        if (dueDate > new Date()) {
          reminders.push({ date: dueDate, type: "due" });
        }

        // 3 days after due
        const threeDaysAfter = new Date(dueDate);
        threeDaysAfter.setDate(threeDaysAfter.getDate() + 3);
        reminders.push({ date: threeDaysAfter, type: "overdue" });

        // 7 days after due
        const sevenDaysAfter = new Date(dueDate);
        sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 7);
        reminders.push({ date: sevenDaysAfter, type: "overdue" });

        const createdIds: number[] = [];
        for (const reminder of reminders) {
          const id = await db.createPaymentReminder({
            userId: ctx.user.id,
            invoiceId: input.invoiceId,
            reminderDate: reminder.date,
            reminderType: reminder.type,
          });
          createdIds.push(id);
        }

        return { created: createdIds.length, ids: createdIds };
      }),
  }),

  // ============ Deadlines ============
  deadlines: router({
    getByMatter: protectedProcedure
      .input(z.object({ matterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDeadlinesByMatterId(input.matterId);
      }),

    getUpcoming: protectedProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ ctx, input }) => {
        return await db.getUpcomingDeadlines(ctx.user.id, input.days);
      }),

    create: protectedProcedure
      .input(z.object({
        matterId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        dueDate: z.date(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      }))
      .mutation(async ({ ctx, input }) => {
        const deadlineId = await db.createDeadline({
          userId: ctx.user.id,
          matterId: input.matterId,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          priority: input.priority,
          isCompleted: false,
          reminderSent: false,
        });

        return { id: deadlineId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        isCompleted: z.boolean().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateDeadline(id, updates);

        return { success: true };
      }),
  }),

  // ============ Task Management ============
  tasks: router({
    list: protectedProcedure
      .input(z.object({
        matterId: z.number().optional(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled", "all"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical", "all"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        let allTasks;

        if (input?.matterId) {
          allTasks = await db.getTasksByMatterId(input.matterId);
        } else {
          allTasks = await db.getTasksByUserId(ctx.user.id);
        }

        // Filter by status
        if (input?.status && input.status !== "all") {
          allTasks = allTasks.filter(task => task.status === input.status);
        }

        // Filter by priority
        if (input?.priority && input.priority !== "all") {
          allTasks = allTasks.filter(task => task.priority === input.priority);
        }

        return allTasks;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTaskById(input.id);
      }),

    getByMatter: protectedProcedure
      .input(z.object({ matterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTasksByMatterId(input.matterId);
      }),

    getPending: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPendingTasks(ctx.user.id);
    }),

    getOverdue: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOverdueTasks(ctx.user.id);
    }),

    getDueToday: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTasksDueToday(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        matterId: z.number().optional(),
        clientId: z.number().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        dueDate: z.date().optional(),
        estimatedMinutes: z.number().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const taskId = await db.createTask({
          userId: ctx.user.id,
          matterId: input.matterId,
          clientId: input.clientId,
          title: input.title,
          description: input.description,
          status: "pending",
          priority: input.priority,
          dueDate: input.dueDate,
          estimatedMinutes: input.estimatedMinutes,
          tags: input.tags,
        });

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "task",
          entityId: taskId,
          action: "created",
          details: JSON.stringify({ title: input.title, matterId: input.matterId }),
        });

        return { id: taskId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        dueDate: z.date().nullable().optional(),
        completedAt: z.date().nullable().optional(),
        actualMinutes: z.number().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;

        // Auto-set completedAt when marking as completed
        if (updates.status === "completed" && !updates.completedAt) {
          updates.completedAt = new Date();
        }

        // Clear completedAt if status changes away from completed
        if (updates.status && updates.status !== "completed") {
          updates.completedAt = null;
        }

        await db.updateTask(id, updates);

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "task",
          entityId: id,
          action: "updated",
          details: JSON.stringify(updates),
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTask(input.id);

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "task",
          entityId: input.id,
          action: "deleted",
          details: JSON.stringify({ id: input.id }),
        });

        return { success: true };
      }),

    // Bulk status update
    bulkUpdateStatus: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const updates: any = { status: input.status };

        if (input.status === "completed") {
          updates.completedAt = new Date();
        } else {
          updates.completedAt = null;
        }

        for (const id of input.ids) {
          await db.updateTask(id, updates);
        }

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "task",
          entityId: input.ids[0],
          action: "bulk_status_update",
          details: JSON.stringify({ ids: input.ids, status: input.status }),
        });

        return { success: true, count: input.ids.length };
      }),
  }),

  // ============ Dashboard Stats ============
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const clients = await db.getClientsByUserId(ctx.user.id);
      const matters = await db.getMattersByUserId(ctx.user.id);
      const intakeForms = await db.getIntakeFormsByUserId(ctx.user.id);
      const invoices = await db.getInvoicesByUserId(ctx.user.id);
      const upcomingDeadlines = await db.getUpcomingDeadlines(ctx.user.id, 7);
      
      const activeClients = clients.filter(c => c.status === "active").length;
      const openMatters = matters.filter(m => m.status === "open").length;
      const newIntakes = intakeForms.filter(i => i.status === "new").length;
      const unpaidInvoices = invoices.filter(i => i.status === "sent" || i.status === "overdue");
      const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      
      return {
        activeClients,
        openMatters,
        newIntakes,
        unpaidInvoicesCount: unpaidInvoices.length,
        totalUnpaidAmount: totalUnpaid,
        upcomingDeadlinesCount: upcomingDeadlines.length,
      };
    }),
    
    analytics: protectedProcedure
      .input(z.object({
        period: z.enum(["month", "quarter", "year"]).optional().default("month"),
      }))
      .query(async ({ ctx, input }) => {
        const invoices = await db.getInvoicesByUserId(ctx.user.id);
        const timeEntries = await db.getTimeEntriesByUserId(ctx.user.id);
        
        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;
        
        switch (input.period) {
          case "quarter":
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default: // month
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        }
        
        // Filter invoices by date range
        const periodInvoices = invoices.filter(inv => 
          new Date(inv.createdAt) >= startDate
        );
        
        // Calculate revenue metrics
        const totalRevenue = invoices.filter(inv => inv.status === "paid")
          .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        
        const periodRevenue = periodInvoices.filter(inv => inv.status === "paid")
          .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        
        const outstandingAmount = invoices.filter(inv => 
          inv.status === "sent" || inv.status === "overdue"
        ).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        
        // Calculate average payment time
        const paidInvoices = invoices.filter(inv => inv.status === "paid" && inv.paidDate);
        let avgPaymentDays = 0;
        
        if (paidInvoices.length > 0) {
          const totalDays = paidInvoices.reduce((sum, inv) => {
            if (!inv.paidDate) return sum;
            const created = new Date(inv.createdAt).getTime();
            const paid = new Date(inv.paidDate).getTime();
            const days = Math.floor((paid - created) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0);
          avgPaymentDays = Math.round(totalDays / paidInvoices.length);
        }
        
        // Calculate collection rate
        const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const collectionRate = totalInvoiced > 0 
          ? Math.round((totalRevenue / totalInvoiced) * 100) 
          : 0;
        
        // Monthly revenue breakdown (last 6 months)
        const monthlyRevenue: Array<{ month: string; revenue: number; invoices: number }> = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          
          const monthInvoices = invoices.filter(inv => {
            const invDate = new Date(inv.createdAt);
            return invDate >= monthDate && invDate <= monthEnd && inv.status === "paid";
          });
          
          const monthRev = monthInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
          
          monthlyRevenue.push({
            month: monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            revenue: monthRev,
            invoices: monthInvoices.length,
          });
        }
        
        // Billable hours tracking
        const billableHours = timeEntries
          .filter(entry => entry.isBillable)
          .reduce((sum, entry) => sum + entry.durationMinutes, 0) / 60;
        
        const periodBillableHours = timeEntries
          .filter(entry => entry.isBillable && new Date(entry.entryDate) >= startDate)
          .reduce((sum, entry) => sum + entry.durationMinutes, 0) / 60;
        
        // Invoice aging
        const aging = {
          current: 0,  // 0-30 days
          days30: 0,   // 31-60 days
          days60: 0,   // 61-90 days
          days90Plus: 0, // 90+ days
        };
        
        invoices.filter(inv => inv.status === "sent" || inv.status === "overdue").forEach(inv => {
          const daysOld = Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          const amount = inv.totalAmount || 0;
          
          if (daysOld <= 30) aging.current += amount;
          else if (daysOld <= 60) aging.days30 += amount;
          else if (daysOld <= 90) aging.days60 += amount;
          else aging.days90Plus += amount;
        });
        
        return {
          totalRevenue,
          periodRevenue,
          outstandingAmount,
          avgPaymentDays,
          collectionRate,
          monthlyRevenue,
          billableHours: Math.round(billableHours * 10) / 10,
          periodBillableHours: Math.round(periodBillableHours * 10) / 10,
          aging,
          totalInvoices: invoices.length,
          paidInvoices: paidInvoices.length,
          unpaidInvoices: invoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").length,
        };
      }),
  }),
  
  // ============ Activity Dashboard ============
  activity: router({
    getAll: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getAllActivityLog(ctx.user.id, input.limit || 50);
      }),
    
    getByType: protectedProcedure
      .input(z.object({ 
        entityType: z.string(),
        limit: z.number().optional() 
      }))
      .query(async ({ ctx, input }) => {
        return await db.getActivityLogByType(ctx.user.id, input.entityType, input.limit || 50);
      }),
    
    getByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getActivityLogByDateRange(ctx.user.id, input.startDate, input.endDate);
      }),
  }),

  // ============ Calendar Integration ============
  calendar: router({
    // Get current integration status
    getIntegration: protectedProcedure.query(async ({ ctx }) => {
      const integration = await db.getCalendarIntegration(ctx.user.id);
      if (!integration) {
        return null;
      }
      // Don't expose tokens to client
      return {
        id: integration.id,
        provider: integration.provider,
        calendarId: integration.calendarId,
        syncDeadlines: integration.syncDeadlines,
        syncTasks: integration.syncTasks,
        lastSyncAt: integration.lastSyncAt,
        isConnected: integration.isConnected,
      };
    }),

    // Get OAuth URL for Google
    getAuthUrl: protectedProcedure.query(async () => {
      const { getGoogleAuthUrl } = await import("./services/calendarService");
      return { url: getGoogleAuthUrl() };
    }),

    // Handle OAuth callback
    handleCallback: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { exchangeCodeForTokens } = await import("./services/calendarService");

        const tokens = await exchangeCodeForTokens(input.code);
        const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

        await db.upsertCalendarIntegration({
          userId: ctx.user.id,
          provider: "google",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiry,
          isConnected: true,
          syncDeadlines: true,
          syncTasks: false,
        });

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "calendar",
          entityId: ctx.user.id,
          action: "connected",
          details: JSON.stringify({ provider: "google" }),
        });

        return { success: true };
      }),

    // List available calendars
    listCalendars: protectedProcedure.query(async ({ ctx }) => {
      const { listCalendars } = await import("./services/calendarService");
      return await listCalendars(ctx.user.id);
    }),

    // Update settings
    updateSettings: protectedProcedure
      .input(z.object({
        calendarId: z.string().optional(),
        syncDeadlines: z.boolean().optional(),
        syncTasks: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateCalendarIntegration(ctx.user.id, input);
        return { success: true };
      }),

    // Disconnect calendar
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const { disconnectCalendar } = await import("./services/calendarService");
      await disconnectCalendar(ctx.user.id);

      await db.logActivity({
        userId: ctx.user.id,
        entityType: "calendar",
        entityId: ctx.user.id,
        action: "disconnected",
        details: JSON.stringify({ provider: "google" }),
      });

      return { success: true };
    }),

    // Sync a deadline to calendar
    syncDeadline: protectedProcedure
      .input(z.object({ deadlineId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { syncDeadlineToCalendar } = await import("./services/calendarService");
        const deadline = await db.getDeadlinesByMatterId(input.deadlineId);

        // Get the deadline from the list (simplified - in real app would have getDeadlineById)
        const deadlineData = deadline.find(d => d.id === input.deadlineId);
        if (!deadlineData) {
          throw new Error("Deadline not found");
        }

        const result = await syncDeadlineToCalendar(ctx.user.id, {
          id: deadlineData.id,
          title: deadlineData.title,
          description: deadlineData.description,
          dueDate: new Date(deadlineData.dueDate),
          priority: deadlineData.priority,
        });

        return result;
      }),

    // Sync a task to calendar
    syncTask: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { syncTaskToCalendar } = await import("./services/calendarService");
        const task = await db.getTaskById(input.taskId);

        if (!task) {
          throw new Error("Task not found");
        }

        if (!task.dueDate) {
          throw new Error("Task has no due date");
        }

        const result = await syncTaskToCalendar(ctx.user.id, {
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: new Date(task.dueDate),
          priority: task.priority,
          estimatedMinutes: task.estimatedMinutes,
        });

        return result;
      }),

    // Remove synced event
    removeSyncedEvent: protectedProcedure
      .input(z.object({
        entityType: z.enum(["deadline", "task"]),
        entityId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { removeSyncedEvent } = await import("./services/calendarService");
        await removeSyncedEvent(ctx.user.id, input.entityType, input.entityId);
        return { success: true };
      }),

    // Get synced events for user
    getSyncedEvents: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCalendarEventsByUser(ctx.user.id);
    }),
  }),

  // ============ Email Integration ============
  email: router({
    // Get integration status
    getIntegration: protectedProcedure.query(async ({ ctx }) => {
      const integration = await db.getEmailIntegration(ctx.user.id);
      if (!integration) return null;
      return {
        id: integration.id,
        provider: integration.provider,
        email: integration.email,
        isConnected: integration.isConnected,
        autoLinkToClients: integration.autoLinkToClients,
        syncEnabled: integration.syncEnabled,
        lastSyncAt: integration.lastSyncAt,
      };
    }),

    // Get Gmail OAuth URL
    getGmailAuthUrl: protectedProcedure.query(async () => {
      const { getGmailAuthUrl } = await import("./services/emailService");
      return { url: getGmailAuthUrl() };
    }),

    // Get Outlook OAuth URL
    getOutlookAuthUrl: protectedProcedure.query(async () => {
      const { getOutlookAuthUrl } = await import("./services/emailService");
      return { url: getOutlookAuthUrl() };
    }),

    // Handle Gmail callback
    handleGmailCallback: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { exchangeGmailCode, getGmailUserEmail } = await import("./services/emailService");

        const tokens = await exchangeGmailCode(input.code);
        const email = await getGmailUserEmail(tokens.access_token);
        const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

        await db.upsertEmailIntegration({
          userId: ctx.user.id,
          provider: "gmail",
          email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiry,
          isConnected: true,
          autoLinkToClients: true,
          syncEnabled: true,
        });

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "email",
          entityId: ctx.user.id,
          action: "connected",
          details: JSON.stringify({ provider: "gmail", email }),
        });

        return { success: true, email };
      }),

    // Handle Outlook callback
    handleOutlookCallback: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { exchangeOutlookCode, getOutlookUserEmail } = await import("./services/emailService");

        const tokens = await exchangeOutlookCode(input.code);
        const email = await getOutlookUserEmail(tokens.access_token);
        const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

        await db.upsertEmailIntegration({
          userId: ctx.user.id,
          provider: "outlook",
          email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiry,
          isConnected: true,
          autoLinkToClients: true,
          syncEnabled: true,
        });

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "email",
          entityId: ctx.user.id,
          action: "connected",
          details: JSON.stringify({ provider: "outlook", email }),
        });

        return { success: true, email };
      }),

    // Update settings
    updateSettings: protectedProcedure
      .input(z.object({
        autoLinkToClients: z.boolean().optional(),
        syncEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateEmailIntegration(ctx.user.id, input);
        return { success: true };
      }),

    // Disconnect email
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const { disconnectEmail } = await import("./services/emailService");
      await disconnectEmail(ctx.user.id);

      await db.logActivity({
        userId: ctx.user.id,
        entityType: "email",
        entityId: ctx.user.id,
        action: "disconnected",
        details: JSON.stringify({}),
      });

      return { success: true };
    }),

    // Sync emails
    sync: protectedProcedure.mutation(async ({ ctx }) => {
      const { syncEmails } = await import("./services/emailService");
      const result = await syncEmails(ctx.user.id);
      return result;
    }),

    // List emails
    list: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
        clientId: z.number().optional(),
        matterId: z.number().optional(),
        unreadOnly: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (input?.clientId) {
          return await db.getEmailsByClientId(input.clientId);
        }
        if (input?.matterId) {
          return await db.getEmailsByMatterId(input.matterId);
        }
        return await db.getEmailsByUserId(ctx.user.id, input?.limit || 50);
      }),

    // Get single email
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEmailById(input.id);
      }),

    // Get unread count
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadEmailCount(ctx.user.id);
    }),

    // Search emails
    search: protectedProcedure
      .input(z.object({ query: z.string(), limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return await db.searchEmails(ctx.user.id, input.query, input.limit);
      }),

    // Update email (mark read, star, archive, link to matter)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        isRead: z.boolean().optional(),
        isStarred: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        matterId: z.number().nullable().optional(),
        clientId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateEmail(id, updates);
        return { success: true };
      }),

    // Send email
    send: protectedProcedure
      .input(z.object({
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string(),
        bodyHtml: z.string(),
        clientId: z.number().optional(),
        matterId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getValidAccessToken, sendGmailMessage, sendOutlookMessage } = await import("./services/emailService");

        const tokenData = await getValidAccessToken(ctx.user.id);
        if (!tokenData) {
          throw new Error("Email not connected");
        }

        const integration = await db.getEmailIntegration(ctx.user.id);
        if (!integration) {
          throw new Error("Email integration not found");
        }

        let result: { id: string; threadId?: string };
        if (tokenData.provider === "gmail") {
          result = await sendGmailMessage(
            tokenData.token,
            input.to,
            input.subject,
            input.bodyHtml,
            input.cc,
            input.bcc
          );
        } else {
          result = await sendOutlookMessage(
            tokenData.token,
            input.to,
            input.subject,
            input.bodyHtml,
            input.cc,
            input.bcc
          );
        }

        // Store sent email in database
        await db.createEmail({
          userId: ctx.user.id,
          clientId: input.clientId,
          matterId: input.matterId,
          externalId: result.id,
          threadId: result.threadId,
          direction: "outbound",
          fromAddress: integration.email,
          toAddresses: JSON.stringify(input.to.map(addr => ({ address: addr }))),
          ccAddresses: input.cc ? JSON.stringify(input.cc.map(addr => ({ address: addr }))) : undefined,
          bccAddresses: input.bcc ? JSON.stringify(input.bcc.map(addr => ({ address: addr }))) : undefined,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          isRead: true,
          sentAt: new Date(),
        });

        await db.logActivity({
          userId: ctx.user.id,
          entityType: "email",
          entityId: 0,
          action: "sent",
          details: JSON.stringify({ to: input.to, subject: input.subject }),
        });

        return { success: true, id: result.id };
      }),

    // Email templates
    templates: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return await db.getEmailTemplatesByUserId(ctx.user.id);
      }),

      get: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await db.getEmailTemplateById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          name: z.string(),
          subject: z.string(),
          bodyHtml: z.string(),
          category: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const id = await db.createEmailTemplate({
            userId: ctx.user.id,
            name: input.name,
            subject: input.subject,
            bodyHtml: input.bodyHtml,
            category: input.category,
          });
          return { id };
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          subject: z.string().optional(),
          bodyHtml: z.string().optional(),
          category: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...updates } = input;
          await db.updateEmailTemplate(id, updates);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteEmailTemplate(input.id);
          return { success: true };
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
