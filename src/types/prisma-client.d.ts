declare module "@prisma/client" {
  export type PrismaClient = any;
  export const PrismaClient: {
    new (...args: any[]): any;
  };
}
