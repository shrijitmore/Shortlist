// scripts/scrape-cardekho.ts
import { writeFileSync } from "fs";

async function main() {
  const res = await fetch("https://www.cardekho.com/", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();

  // Each car block: id, brand, priceRange, image URL — model name lives in the image path
  const pattern = /"id":(\d+),"brandName":"([^"]+)","brandSlug":"([^"]+)"[^}]*?"priceRange":"([^"]+)"[^}]*?"image":"([^"]+)"/g;

  const seen = new Set<number>();
  const cars: any[] = [];

  for (const m of html.matchAll(pattern)) {
    const id = parseInt(m[1]);
    if (seen.has(id)) continue;
    seen.add(id);

    // Parse price range "10.79 - 20.20 Lakh" → {min: 10.79, max: 20.20}
    const priceMatch = m[4].match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (!priceMatch) continue;

    // Parse model name from image URL:
    // .../carexteriorimages/630x420/Hyundai/Creta/8667/... → "Creta"
    const modelMatch = m[5].match(
      /carexteriorimages\/\d+x\d+\/[^/]+\/([^/]+)\//
    );
    const model = modelMatch ? modelMatch[1] : null;
    if (!model) continue;

    cars.push({
      id,
      brand: m[2],
      brand_slug: m[3],
      model,
      price_min_lakh: parseFloat(priceMatch[1]),
      price_max_lakh: parseFloat(priceMatch[2]),
      price_range_raw: m[4],
      image_url: m[5],
      scraped_at: new Date().toISOString(),
    });
  }

  writeFileSync(
    "data/cardekho-models.json",
    JSON.stringify(cars, null, 2)
  );
  console.log(`✓ Scraped ${cars.length} models from CarDekho`);
  console.log("Sample:", cars.slice(0, 3).map((c) => `${c.brand} ${c.model} — ₹${c.price_min_lakh}L`));
}

main().catch(console.error);