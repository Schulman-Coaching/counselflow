import { drizzle } from 'drizzle-orm/mysql2';
import { documentTemplates } from './drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

const templates = [
  {
    userId: 1,
    name: "Simple Will",
    description: "Basic last will and testament for individuals with straightforward estates",
    category: "Estate Planning",
    templateContent: `LAST WILL AND TESTAMENT

I, {{testator_name}}, a resident of {{testator_address}}, {{testator_city}}, {{testator_state}}, being of sound mind and disposing memory, do hereby make, publish and declare this to be my Last Will and Testament, hereby revoking all wills and codicils previously made by me.

ARTICLE I - FAMILY
I am {{marital_status}}. {{spouse_clause}}
{{children_clause}}

ARTICLE II - DEBTS AND EXPENSES
I direct that all my just debts, funeral expenses, and expenses of administration be paid as soon as practicable after my death.

ARTICLE III - SPECIFIC BEQUESTS
{{specific_bequests}}

ARTICLE IV - RESIDUARY ESTATE
I give, devise and bequeath all the rest, residue and remainder of my estate, both real and personal, of whatsoever kind and wheresoever situated, to {{residuary_beneficiary}}.

ARTICLE V - EXECUTOR
I hereby nominate and appoint {{executor_name}} as Executor of this Will. If {{executor_name}} is unable or unwilling to serve, I nominate {{alternate_executor}} as alternate Executor.

I direct that no bond or other security shall be required of any Executor named herein.

IN WITNESS WHEREOF, I have hereunto set my hand this {{execution_date}}.

_________________________
{{testator_name}}, Testator

WITNESSES:
We, the undersigned, being first duly sworn, declare to the undersigned authority that the testator signed this will in our presence, and that we signed as witnesses in the presence of the testator and of each other.

Witness 1: _________________________
Name: {{witness1_name}}
Address: {{witness1_address}}

Witness 2: _________________________
Name: {{witness2_name}}
Address: {{witness2_address}}`,
    questionnaireSchema: JSON.stringify({
      testator_name: { type: "text", label: "Your Full Legal Name", required: true },
      testator_address: { type: "text", label: "Street Address", required: true },
      testator_city: { type: "text", label: "City", required: true },
      testator_state: { type: "text", label: "State", required: true },
      marital_status: { type: "select", label: "Marital Status", options: ["married", "single", "divorced", "widowed"], required: true },
      spouse_clause: { type: "text", label: "Spouse Information (if married)", required: false },
      children_clause: { type: "textarea", label: "Children Information", required: false },
      specific_bequests: { type: "textarea", label: "Specific Bequests (e.g., jewelry, vehicles)", required: false },
      residuary_beneficiary: { type: "text", label: "Main Beneficiary Name", required: true },
      executor_name: { type: "text", label: "Executor Full Name", required: true },
      alternate_executor: { type: "text", label: "Alternate Executor Name", required: true },
      execution_date: { type: "date", label: "Date of Execution", required: true },
      witness1_name: { type: "text", label: "Witness 1 Full Name", required: true },
      witness1_address: { type: "text", label: "Witness 1 Address", required: true },
      witness2_name: { type: "text", label: "Witness 2 Full Name", required: true },
      witness2_address: { type: "text", label: "Witness 2 Address", required: true }
    }),
    isPublic: true,
  },
  {
    userId: 1,
    name: "Power of Attorney",
    description: "General durable power of attorney for financial and legal matters",
    category: "Estate Planning",
    templateContent: `GENERAL DURABLE POWER OF ATTORNEY

KNOW ALL BY THESE PRESENTS that I, {{principal_name}}, of {{principal_address}}, {{principal_city}}, {{principal_state}} (the "Principal"), do hereby appoint {{agent_name}}, of {{agent_address}}, {{agent_city}}, {{agent_state}}, as my true and lawful Attorney-in-Fact (the "Agent").

ARTICLE I - GRANT OF AUTHORITY
I grant to my Agent full power and authority to act on my behalf in all matters, including but not limited to:

1. Real Property Transactions: To buy, sell, lease, mortgage, or otherwise deal with real property
2. Banking and Financial Transactions: To open, close, and manage bank accounts, investments, and securities
3. Tax Matters: To prepare, sign, and file tax returns and deal with tax authorities
4. Legal Matters: To engage attorneys and initiate or defend legal proceedings
5. Insurance: To purchase, modify, or cancel insurance policies
6. Business Operations: To operate, manage, or sell business interests
7. Government Benefits: To apply for and manage government benefits
8. Personal and Family Maintenance: To pay bills and provide for family support

ARTICLE II - DURABILITY
This Power of Attorney shall {{durability_clause}}.

ARTICLE III - SUCCESSOR AGENT
If {{agent_name}} is unable or unwilling to serve as Agent, I appoint {{successor_agent}} as successor Agent.

ARTICLE IV - EFFECTIVE DATE
This Power of Attorney shall become effective {{effective_date_clause}}.

ARTICLE V - REVOCATION
I reserve the right to revoke this Power of Attorney at any time by providing written notice to my Agent.

IN WITNESS WHEREOF, I have executed this Power of Attorney on {{execution_date}}.

_________________________
{{principal_name}}, Principal

STATE OF {{notary_state}}
COUNTY OF {{notary_county}}

On {{notary_date}}, before me, {{notary_name}}, a Notary Public, personally appeared {{principal_name}}, proved to me through satisfactory evidence of identification to be the person whose name is subscribed to the within instrument and acknowledged to me that he/she executed the same.

_________________________
Notary Public
My Commission Expires: {{notary_expiration}}`,
    questionnaireSchema: JSON.stringify({
      principal_name: { type: "text", label: "Your Full Legal Name (Principal)", required: true },
      principal_address: { type: "text", label: "Your Street Address", required: true },
      principal_city: { type: "text", label: "Your City", required: true },
      principal_state: { type: "text", label: "Your State", required: true },
      agent_name: { type: "text", label: "Agent Full Name", required: true },
      agent_address: { type: "text", label: "Agent Street Address", required: true },
      agent_city: { type: "text", label: "Agent City", required: true },
      agent_state: { type: "text", label: "Agent State", required: true },
      durability_clause: { type: "select", label: "Durability", options: ["remain in effect even if I become incapacitated", "terminate upon my incapacity"], required: true },
      successor_agent: { type: "text", label: "Successor Agent Name", required: false },
      effective_date_clause: { type: "select", label: "When Effective", options: ["immediately", "upon my incapacity as determined by a physician"], required: true },
      execution_date: { type: "date", label: "Date of Execution", required: true },
      notary_state: { type: "text", label: "Notary State", required: true },
      notary_county: { type: "text", label: "Notary County", required: true },
      notary_date: { type: "date", label: "Notarization Date", required: true },
      notary_name: { type: "text", label: "Notary Public Name", required: true },
      notary_expiration: { type: "date", label: "Notary Commission Expiration", required: true }
    }),
    isPublic: true,
  },
  {
    userId: 1,
    name: "Business Contract",
    description: "General business services agreement between two parties",
    category: "Business Law",
    templateContent: `SERVICES AGREEMENT

This Services Agreement (the "Agreement") is entered into as of {{effective_date}} (the "Effective Date"), by and between:

{{client_name}} ("Client")
{{client_address}}
{{client_city}}, {{client_state}} {{client_zip}}

and

{{service_provider_name}} ("Service Provider")
{{provider_address}}
{{provider_city}}, {{provider_state}} {{provider_zip}}

WHEREAS, Client desires to retain Service Provider to provide certain services; and
WHEREAS, Service Provider agrees to provide such services on the terms and conditions set forth herein.

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:

1. SERVICES
Service Provider agrees to provide the following services (the "Services"):
{{services_description}}

2. TERM
This Agreement shall commence on {{start_date}} and continue until {{end_date}}, unless earlier terminated as provided herein.

3. COMPENSATION
Client agrees to pay Service Provider {{payment_amount}} for the Services. Payment terms: {{payment_terms}}.

4. INDEPENDENT CONTRACTOR
Service Provider is an independent contractor and not an employee of Client. Service Provider shall be responsible for all taxes, insurance, and benefits.

5. CONFIDENTIALITY
Both parties agree to maintain the confidentiality of any proprietary or confidential information disclosed during the term of this Agreement.

6. INTELLECTUAL PROPERTY
{{ip_clause}}

7. TERMINATION
Either party may terminate this Agreement with {{termination_notice}} days written notice. Upon termination, Client shall pay for all services rendered through the termination date.

8. LIABILITY
Service Provider's total liability under this Agreement shall not exceed the total amount paid by Client under this Agreement.

9. GOVERNING LAW
This Agreement shall be governed by the laws of the State of {{governing_state}}.

10. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements and understandings.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

CLIENT:
_________________________
{{client_name}}
Date: _______________

SERVICE PROVIDER:
_________________________
{{service_provider_name}}
Date: _______________`,
    questionnaireSchema: JSON.stringify({
      effective_date: { type: "date", label: "Effective Date", required: true },
      client_name: { type: "text", label: "Client Name", required: true },
      client_address: { type: "text", label: "Client Address", required: true },
      client_city: { type: "text", label: "Client City", required: true },
      client_state: { type: "text", label: "Client State", required: true },
      client_zip: { type: "text", label: "Client ZIP Code", required: true },
      service_provider_name: { type: "text", label: "Service Provider Name", required: true },
      provider_address: { type: "text", label: "Provider Address", required: true },
      provider_city: { type: "text", label: "Provider City", required: true },
      provider_state: { type: "text", label: "Provider State", required: true },
      provider_zip: { type: "text", label: "Provider ZIP Code", required: true },
      services_description: { type: "textarea", label: "Description of Services", required: true },
      start_date: { type: "date", label: "Start Date", required: true },
      end_date: { type: "date", label: "End Date", required: true },
      payment_amount: { type: "text", label: "Payment Amount (e.g., $5,000)", required: true },
      payment_terms: { type: "text", label: "Payment Terms (e.g., Net 30)", required: true },
      ip_clause: { type: "textarea", label: "Intellectual Property Clause", required: true },
      termination_notice: { type: "number", label: "Termination Notice (days)", required: true },
      governing_state: { type: "text", label: "Governing Law State", required: true }
    }),
    isPublic: true,
  },
  {
    userId: 1,
    name: "Demand Letter",
    description: "Formal demand letter for payment or action",
    category: "Litigation",
    templateContent: `{{law_firm_name}}
{{law_firm_address}}
{{law_firm_city}}, {{law_firm_state}} {{law_firm_zip}}
Phone: {{law_firm_phone}}
Email: {{law_firm_email}}

{{current_date}}

{{recipient_name}}
{{recipient_address}}
{{recipient_city}}, {{recipient_state}} {{recipient_zip}}

RE: Demand for {{demand_subject}}

Dear {{recipient_name}}:

This firm represents {{client_name}} (the "Client") in connection with {{matter_description}}.

BACKGROUND
{{background_facts}}

LEGAL BASIS
{{legal_basis}}

DEMAND
We hereby demand that you {{specific_demand}} within {{response_deadline}} days of the date of this letter.

Specifically, we demand:
{{demand_details}}

CONSEQUENCES OF NON-COMPLIANCE
Please be advised that if you fail to comply with this demand within the specified time period, our client is prepared to pursue all available legal remedies, including but not limited to filing a lawsuit seeking:
- {{remedy_1}}
- {{remedy_2}}
- {{remedy_3}}
- Attorneys' fees and costs of litigation

PRESERVATION OF EVIDENCE
You are hereby on notice to preserve all documents, communications, and other evidence related to this matter.

RESPONSE
Please direct all correspondence regarding this matter to the undersigned. We expect your response no later than {{response_date}}.

This letter is written in an attempt to resolve this matter without litigation. Nothing in this letter should be construed as a waiver of any rights or remedies available to our client, all of which are expressly reserved.

Very truly yours,

_________________________
{{attorney_name}}
{{attorney_title}}
{{law_firm_name}}

cc: {{client_name}}`,
    questionnaireSchema: JSON.stringify({
      law_firm_name: { type: "text", label: "Law Firm Name", required: true },
      law_firm_address: { type: "text", label: "Law Firm Address", required: true },
      law_firm_city: { type: "text", label: "City", required: true },
      law_firm_state: { type: "text", label: "State", required: true },
      law_firm_zip: { type: "text", label: "ZIP Code", required: true },
      law_firm_phone: { type: "text", label: "Phone Number", required: true },
      law_firm_email: { type: "text", label: "Email Address", required: true },
      current_date: { type: "date", label: "Letter Date", required: true },
      recipient_name: { type: "text", label: "Recipient Name", required: true },
      recipient_address: { type: "text", label: "Recipient Address", required: true },
      recipient_city: { type: "text", label: "Recipient City", required: true },
      recipient_state: { type: "text", label: "Recipient State", required: true },
      recipient_zip: { type: "text", label: "Recipient ZIP", required: true },
      demand_subject: { type: "text", label: "Subject of Demand", required: true },
      client_name: { type: "text", label: "Your Client's Name", required: true },
      matter_description: { type: "textarea", label: "Matter Description", required: true },
      background_facts: { type: "textarea", label: "Background Facts", required: true },
      legal_basis: { type: "textarea", label: "Legal Basis for Demand", required: true },
      specific_demand: { type: "text", label: "Specific Action Demanded", required: true },
      response_deadline: { type: "number", label: "Response Deadline (days)", required: true },
      demand_details: { type: "textarea", label: "Detailed Demands", required: true },
      remedy_1: { type: "text", label: "Remedy 1", required: true },
      remedy_2: { type: "text", label: "Remedy 2", required: false },
      remedy_3: { type: "text", label: "Remedy 3", required: false },
      response_date: { type: "date", label: "Response Due Date", required: true },
      attorney_name: { type: "text", label: "Your Name", required: true },
      attorney_title: { type: "text", label: "Your Title", required: true }
    }),
    isPublic: true,
  },
  {
    userId: 1,
    name: "NDA (Non-Disclosure Agreement)",
    description: "Mutual non-disclosure agreement for protecting confidential information",
    category: "Business Law",
    templateContent: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "Agreement") is entered into as of {{effective_date}} (the "Effective Date"), by and between:

{{party1_name}} ("Party 1")
{{party1_address}}

and

{{party2_name}} ("Party 2")
{{party2_address}}

(collectively, the "Parties")

WHEREAS, the Parties wish to explore a business relationship concerning {{purpose}} (the "Purpose"); and
WHEREAS, in connection with the Purpose, each Party may disclose certain confidential and proprietary information to the other Party.

NOW, THEREFORE, the Parties agree as follows:

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any information disclosed by one Party (the "Disclosing Party") to the other Party (the "Receiving Party"), whether orally, in writing, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.

2. OBLIGATIONS OF RECEIVING PARTY
The Receiving Party agrees to:
a) Hold the Confidential Information in strict confidence
b) Not disclose the Confidential Information to third parties without prior written consent
c) Not use the Confidential Information for any purpose other than the Purpose
d) Protect the Confidential Information using the same degree of care used to protect its own confidential information, but in no event less than reasonable care

3. EXCEPTIONS
The obligations set forth in Section 2 shall not apply to information that:
a) Was publicly known at the time of disclosure
b) Becomes publicly known through no breach of this Agreement
c) Was rightfully known by the Receiving Party prior to disclosure
d) Is independently developed by the Receiving Party without use of the Confidential Information
e) Is required to be disclosed by law or court order

4. TERM
This Agreement shall remain in effect for {{term_years}} years from the Effective Date. The obligations regarding Confidential Information shall survive termination for {{survival_years}} years.

5. RETURN OF MATERIALS
Upon termination of this Agreement or upon request, each Party shall promptly return or destroy all Confidential Information received from the other Party.

6. NO LICENSE
Nothing in this Agreement grants any license or right to the Receiving Party in or to the Disclosing Party's Confidential Information, except as expressly set forth herein.

7. REMEDIES
The Parties acknowledge that monetary damages may be insufficient to compensate for a breach of this Agreement, and that the Disclosing Party shall be entitled to seek equitable relief, including injunction and specific performance.

8. GOVERNING LAW
This Agreement shall be governed by the laws of the State of {{governing_state}}.

9. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the Parties concerning the subject matter hereof and supersedes all prior agreements and understandings.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

PARTY 1:
_________________________
{{party1_name}}
{{party1_title}}
Date: _______________

PARTY 2:
_________________________
{{party2_name}}
{{party2_title}}
Date: _______________`,
    questionnaireSchema: JSON.stringify({
      effective_date: { type: "date", label: "Effective Date", required: true },
      party1_name: { type: "text", label: "Party 1 Name", required: true },
      party1_address: { type: "text", label: "Party 1 Address", required: true },
      party1_title: { type: "text", label: "Party 1 Title/Position", required: true },
      party2_name: { type: "text", label: "Party 2 Name", required: true },
      party2_address: { type: "text", label: "Party 2 Address", required: true },
      party2_title: { type: "text", label: "Party 2 Title/Position", required: true },
      purpose: { type: "textarea", label: "Purpose of Disclosure", required: true },
      term_years: { type: "number", label: "Agreement Term (years)", required: true },
      survival_years: { type: "number", label: "Confidentiality Survival Period (years)", required: true },
      governing_state: { type: "text", label: "Governing Law State", required: true }
    }),
    isPublic: true,
  }
];

console.log('Seeding document templates...');

for (const template of templates) {
  try {
    const result = await db.insert(documentTemplates).values(template);
    console.log(`✓ Created template: ${template.name}`);
  } catch (error) {
    console.error(`✗ Failed to create template ${template.name}:`, error.message);
  }
}

console.log('\nSeeding complete!');
process.exit(0);
