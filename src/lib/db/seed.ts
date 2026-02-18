import { faker } from "@faker-js/faker";
import { neon } from "@neondatabase/serverless";

import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

import { apartmentTable } from "./schema";

dotenv.config();

async function main() {
  const connector = neon(process.env.DATABASE_URL!);

  const db = drizzle(connector);

  const apartments: (typeof apartmentTable.$inferInsert)[] = [];

  const apartmentsData = [
    {
      imageId:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      description:
        "Modern loft in the city center with exposed brick, large windows, and plenty of natural light.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
      description:
        "Cozy studio near public transport, ideal for singles or students; compact kitchen and efficient layout.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1630699293784-9f977570255a?auto=format&fit=crop&w=1200&q=80",
      description:
        "Spacious two-bedroom apartment with balcony overlooking a quiet park — great for families.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
      description:
        "Charming historic apartment with original moldings and hardwood floors, recently renovated for modern comfort.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
      description:
        "Luxury penthouse with skyline views, private terrace, and high-end finishes throughout.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1658218635253-64728f6234be?auto=format&fit=crop&w=1200&q=80",
      description:
        "Renovated two-bedroom with open-plan living area and modern appliances, close to shops and cafes.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      description:
        "Sunny one-bedroom with high ceilings and hardwood floors, perfect for professionals working nearby.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
      description:
        "Stylish industrial loft with floor-to-ceiling windows and exposed beams for a modern aesthetic.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1630699144867-37acec97df5a?auto=format&fit=crop&w=1200&q=80",
      description:
        "Seaside apartment with panoramic ocean views and a balcony — great for weekend getaways.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80",
      description:
        "Mountain-view apartment with cozy wood interiors and a warm, cabin-like atmosphere.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
      description:
        "Quiet suburban apartment with garden access and plenty of storage space.",
    },
    {
      imageId:
        "https://images.unsplash.com/photo-1580041065738-e72023775cdc?auto=format&fit=crop&w=1200&q=80",
      description:
        "Minimalist new-build with smart-home features, energy-efficient appliances, and clean lines.",
    },
  ];

  apartmentsData.forEach(({ description, imageId }, i) => {
    apartments.push({
      id: (i + 1).toString(),
      name: `${faker.location.streetAddress()} Apt ${i + 1}`,
      description,
      price: parseFloat(faker.commerce.price({ min: 400, max: 3000 })),
      imageId,
    });
  });

  apartments.forEach(async (a) => {
    await db.insert(apartmentTable).values(a).onConflictDoNothing();
  });
}

main();
