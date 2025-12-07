import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext, type TrpcContext } from './_core/context';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.use(
  '/api/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }): TrpcContext => createContext({ req, res }),
  })
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export type AppRouter = typeof appRouter;
