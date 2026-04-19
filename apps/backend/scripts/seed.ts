#!/usr/bin/env node
// apps/backend/scripts/seed.ts
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const dbDir = process.env.DB_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'shortlist.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    variant TEXT NOT NULL,
    price_min_lakh REAL NOT NULL,
    price_max_lakh REAL NOT NULL,
    fuel_type TEXT NOT NULL,
    transmission TEXT NOT NULL,
    seating INTEGER NOT NULL,
    length_mm INTEGER NOT NULL,
    mileage_kmpl REAL NOT NULL,
    safety_rating REAL NOT NULL,
    segment TEXT NOT NULL,
    source_tag TEXT NOT NULL DEFAULT 'CarDekho 2025',
    image_url TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    raw_input TEXT NOT NULL,
    parsed_data TEXT,
    clarifier_question TEXT,
    clarifier_options TEXT,
    clarifier_answer TEXT,
    shortlist TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.prepare('DELETE FROM cars').run();

// Search for the data model JSON in multiple possible locations
const pathsToTry = [
  path.join(process.cwd(), 'data', 'cardekho-models.json'),
  path.join(process.cwd(), 'apps', 'backend', 'data', 'cardekho-models.json'), // Local dev fallback
  '/app/data/cardekho-models.json', // Docker fallback
];

let jsonPath = '';
for (const p of pathsToTry) {
  if (fs.existsSync(p)) {
    jsonPath = p;
    break;
  }
}

if (!jsonPath) {
  console.error('❌ Could not find cardekho-models.json in any of the following paths:');
  pathsToTry.forEach(p => console.error(`   - ${p}`));
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const mappedCars = rawData.map((item: any) => {
  const model = item.model;
  const brand = item.brand.replace(' Suzuki', '').replace(' Motor', '');
  const rawRange = item.price_range_raw || '';
  const isCrore = rawRange.toLowerCase().includes('cr');
  
  // Convert Cr to Lakhs
  let priceMin = item.price_min_lakh || 0;
  let priceMax = item.price_max_lakh || 0;
  if (isCrore) {
    priceMin *= 100;
    priceMax *= 100;
  }

  // Heuristic: Fuel Type
  let fuelType = 'petrol';
  if (model.match(/EV|Electric|e-Vitara|XEV|X-EV/i)) fuelType = 'electric';
  else if (model.match(/Hybrid|h:EV|e:HEV/i)) fuelType = 'hybrid';
  else if (model.match(/Diesel/i)) fuelType = 'diesel';

  // Heuristic: Seating
  let seating = 5;
  if (model.match(/Innova|Ertiga|Carens|Vellfire|Majestor|Scorpio|Fortuner|X7|Defender|Defender|Sierra/i)) {
    seating = 7;
  }

  // Heuristic: Segment
  let segment = 'suv';
  if (model.match(/Verna|Dzire|Aura|Virtus|CLA|Magnite/i)) segment = 'sedan';
  else if (model.match(/Swift|Baleno|Tiago|i20|Wagon-R|Alto|Nios|Punch/i)) segment = 'hatchback';
  else if (model.match(/Ertiga|Innova|Carens|Vellfire|Windsor|Majestor/i)) segment = 'mpv';
  else if (model.match(/Nexon|Fronx|Punch|Creta|Seltos|Taigun|Urban-Cruiser|BE-6/i)) segment = 'compact-suv';

  // Heuristic: Safety
  let safety = 4.0;
  if (brand.match(/Tata|Mahindra|Volkswagen|Skoda/i)) safety = 5.0;
  if (brand === 'Maruti' && priceMax < 10) safety = 3.0;

  // Heuristic: Transmission
  let transmission = 'manual';
  if (fuelType === 'electric' || fuelType === 'hybrid' || brand.match(/BMW|Mercedes|Porsche|Land Rover/i) || priceMin > 25) {
    transmission = 'automatic';
  }

  // Heuristic: Length
  let length = 4300;
  if (segment === 'hatchback') length = 3850;
  if (segment === 'sedan' || seating === 7) length = 4600;

  // Heuristic: Mileage
  let mileage = 17.5;
  if (fuelType === 'electric') mileage = 0;
  else if (fuelType === 'hybrid') mileage = 26.5;
  else if (brand === 'Maruti') mileage = 22.0;

  return {
    id: item.id,
    brand: brand,
    model: model,
    variant: 'Standard',
    price_min_lakh: priceMin,
    price_max_lakh: priceMax,
    fuel_type: fuelType,
    transmission: transmission,
    seating: seating,
    length_mm: length,
    mileage_kmpl: mileage,
    safety_rating: safety,
    segment: segment,
    source_tag: 'CarDekho 2025',
    image_url: item.image_url
  };
});

const insert = db.prepare(`
  INSERT OR REPLACE INTO cars
    (id, brand, model, variant, price_min_lakh, price_max_lakh, fuel_type, transmission,
     seating, length_mm, mileage_kmpl, safety_rating, segment, source_tag, image_url)
  VALUES
    (@id, @brand, @model, @variant, @price_min_lakh, @price_max_lakh, @fuel_type, @transmission,
     @seating, @length_mm, @mileage_kmpl, @safety_rating, @segment, @source_tag, @image_url)
`);

const insertMany = db.transaction((carsData: any[]) => {
  for (const car of carsData) {
    insert.run(car);
  }
});

insertMany(mappedCars);

const count = (db.prepare('SELECT COUNT(*) as cnt FROM cars').get() as { cnt: number }).cnt;
console.log(`✅ Seeded ${count} cars from cardekho-models.json into ${dbPath}`);

const sample = db.prepare('SELECT brand, model, price_min_lakh, fuel_type FROM cars LIMIT 5').all();
console.log('Sample data:', sample);

db.close();
