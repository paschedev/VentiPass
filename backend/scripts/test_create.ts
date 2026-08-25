import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) throw new Error("No admin found");

    const event = await prisma.event.create({
      data: {
        title: "Test Event",
        description: "Test Desc",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        venueName: "Test Venue",
        venueAddress: "Test Addr",
        status: "PUBLISHED",
        organizer: {
          connect: { id: adminUser.id }
        },
        ticketTypes: {
          create: [
            {
              name: 'General',
              price: 5000,
              stock: 200,
              saleStart: new Date().toISOString(),
              saleEnd: new Date(Date.now() + 86400000).toISOString(),
            }
          ]
        }
      }
    });
    console.log("Success!", event);
  } catch (err) {
    console.error("Failed to create event:", err);
  }
}

main().finally(() => prisma.$disconnect());
