-- AlterTable
ALTER TABLE "TicketType" ADD CONSTRAINT "check_stock_limits" CHECK (stock >= (sold + reserved));
