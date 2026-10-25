const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'e90.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for better concurrency and performance
db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`PRAGMA foreign_keys = ON;`);

// Initialize Database Schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL, -- 'charity', 'run', 'track', 'social'
      date TEXT NOT NULL,
      time TEXT,
      location TEXT NOT NULL,
      spots INTEGER DEFAULT 0,
      desc TEXT,
      image_url TEXT,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'membership', 'driver', 'cause', 'general'
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT,
      phone TEXT,
      status TEXT DEFAULT 'new', -- 'new', 'pending', 'approved', 'declined'
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vibes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS perks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      order_index INTEGER DEFAULT 0
    );
  `);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// Seed Initial Data if empty
function seedData() {
  // 1. Seed Admin User
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users;').get().count;
  if (userCount === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword('admin123', salt);
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, salt, role)
      VALUES (?, ?, ?, 'admin');
    `);
    insertUser.run('admin', hash, salt);
    console.log('[DB] Created default admin user: "admin" (password: "admin123")');
  }

  // 2. Seed Default Events
  const eventCount = db.prepare('SELECT COUNT(*) as count FROM events;').get().count;
  if (eventCount === 0) {
    const insertEvent = db.prepare(`
      INSERT INTO events (title, type, date, time, location, spots, desc, image_url, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);
    `);
    insertEvent.run(
      'Charity Drive',
      'charity',
      '2026-06-21',
      '09:00',
      'Sizanani Village',
      30,
      'Bringing the convoy to communities that need it most. Show up, give back, drive home different.',
      '../Assets/IMG-20260406-WA0000.jpg'
    );
    insertEvent.run(
      'Sunrise Run',
      'run',
      '2026-07-05',
      '05:30',
      'Johannesburg',
      20,
      'Pre-dawn meetup. Cold engines, warm coffee, open road.',
      '../Assets/IMG-20260406-WA0001.jpg'
    );
    insertEvent.run(
      'Kyalami Day',
      'track',
      '2026-08-10',
      '08:00',
      'Kyalami Circuit',
      15,
      'The circuit, the cars, the crew. One afternoon on track.',
      '../Assets/IMG-20260405-WA0016.jpg'
    );
    console.log('[DB] Seeded initial events');
  }

  // 3. Seed Default Enquiries (Memberships, Drivers, Causes)
  const enquiryCount = db.prepare('SELECT COUNT(*) as count FROM enquiries;').get().count;
  if (enquiryCount === 0) {
    const insertEnquiry = db.prepare(`
      INSERT INTO enquiries (type, name, email, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `);

    // Memberships
    insertEnquiry.run('membership', 'Sipho Ndlovu', 'sipho@email.com', "Had my E90 for 6 years. First car I've ever felt truly connected to. Been following the club for a while — ready to ride.", 'new', '2026-04-22 10:30:00');
    insertEnquiry.run('membership', 'Ayesha Patel', 'ayesha@email.com', '325i owner, track day enthusiast. Looking for a crew that actually knows the car.', 'new', '2026-04-20 14:15:00');
    insertEnquiry.run('membership', 'Luca van der Berg', 'luca@email.com', 'My dad had an E90 330i. I just bought mine. Full circle.', 'new', '2026-04-18 09:00:00');
    insertEnquiry.run('membership', 'Thabo Mokoena', 'thabo@email.com', '320d daily driver. Looking for a community.', 'approved', '2026-04-10 16:45:00');
    insertEnquiry.run('membership', 'Priya Singh', 'priya@email.com', 'Not an E90 owner yet but saving up. Want in early.', 'declined', '2026-04-05 11:20:00');

    // Charity Drivers
    insertEnquiry.run('driver', 'Mandla Khumalo', 'mandla@email.com', '330i Sport with roof rack — can carry supplies. Available weekends. Happy to co-organise logistics.', 'new', '2026-04-21 12:00:00');
    insertEnquiry.run('driver', 'Jess Ferreira', 'jess@email.com', '320i — available any Saturday. Also have photography skills to document the drive.', 'new', '2026-04-19 15:30:00');

    // Causes
    insertEnquiry.run('cause', 'Sizanani Children\'s Village', 'admin@sizanani.org.za', 'We support 80+ orphaned children in Bapsfontein. Urgently need non-perishable food, blankets, and stationery. Could host the convoy as a collection point.', 'new', '2026-04-23 08:30:00');
    insertEnquiry.run('cause', 'Diepsloot Youth Hub', 'info@dyh.co.za', 'Skills development centre for youth aged 16–24. Looking for mentors and resources. Would love the visibility a convoy brings.', 'pending', '2026-04-17 13:40:00');
    insertEnquiry.run('cause', 'Zanele Dlamini', 'zanele@email.com', 'Raising funds for my nephew\'s rare disease treatment. Any support — awareness or fundraising — would mean everything.', 'new', '2026-04-15 17:10:00');

    console.log('[DB] Seeded initial enquiries and applications');
  }

  // 4. Seed Default Vibes
  const vibesCount = db.prepare('SELECT COUNT(*) as count FROM vibes;').get().count;
  if (vibesCount === 0) {
    const insertVibe = db.prepare(`
      INSERT INTO vibes (title, description, icon, order_index)
      VALUES (?, ?, ?, ?);
    `);
    insertVibe.run('Breakfast Runs', 'Early mornings. Empty roads. Engines warming with the sun. That first pull out of the driveway — that\'s the ritual.', 'sun', 1);
    insertVibe.run('Charity Drives', 'Same machines. Different purpose. We ride together — and give back louder than we arrive.', 'heart', 2);
    insertVibe.run('Long Hauls', 'Multi-day convoys. Mountain passes. The kind of roads that remind you exactly why you chose this car.', 'headphones', 3);
    insertVibe.run('Track Days', 'When the road isn\'t enough. Full send on tarmac built for exactly this. No commuters. No speed limits. Just you and the car.', 'award', 4);
    console.log('[DB] Seeded initial vibes');
  }

  // 5. Seed Default Perks
  const perksCount = db.prepare('SELECT COUNT(*) as count FROM perks;').get().count;
  if (perksCount === 0) {
    const insertPerk = db.prepare(`
      INSERT INTO perks (text, order_index)
      VALUES (?, ?);
    `);
    insertPerk.run('Access to all convoys and runs', 1);
    insertPerk.run('Crew WhatsApp + event alerts', 2);
    insertPerk.run('Priority spots on charity drives', 3);
    insertPerk.run('E90 SC member sticker', 4);
    console.log('[DB] Seeded initial perks');
  }

  // 6. Seed Site Content
  const contentCount = db.prepare('SELECT COUNT(*) as count FROM site_content;').get().count;
  if (contentCount === 0) {
    const defaultSiteContent = {
      // Home Page
      hero_title: 'BMW E90 Social Club',
      hero_subtitle: 'Sharing the Good Vibes',
      crew_title: 'The Crew',
      crew_desc: 'From an idea to a community driven by a common goal: celebrating the spirit, timeless aesthetic, and pure driving dynamics of the BMW E90 3 Series.',
      drive_title: 'Our Drive',
      drive_desc: 'We don\'t just park and pose. We move with purpose — from sunrise breakfast runs through twisting mountain passes to charity drives that uplift local communities.',
      cta_title: 'Join the Convoy',
      cta_desc: 'Whether you daily a 320d, open the taps on an inline-six 330i, push boost in a 335i, or rev out a V8 M3 — you have a home with us.',
      // About Page
      club_badge: 'Est. Johannesburg',
      club_title: 'The Club',
      club_p1: 'It didn\'t start as a movement. Just a few cars, a few late nights, and a shared obsession with the E90. Then the convoy grew.',
      club_p2: 'Today, E90 Social Club connects passionate owners across Gauteng and beyond. We celebrate every chassis, every build, and every road driven.',
      mission_badge: 'What Drives Us',
      mission_title: 'The Drive',
      mission_desc: 'We don\'t just show up. We move with purpose — from sunrise runs to giving back where it matters. Every convoy has a reason. Every mile means something.',
      // Contact Info
      contact_city: 'Johannesburg, South Africa',
      contact_email: 'crew@e90socialclub.co.za',
      contact_tagline: 'Built on passion. Driven by community.'
    };

    const insertContent = db.prepare(`
      INSERT INTO site_content (key, value)
      VALUES (?, ?);
    `);
    for (const [key, val] of Object.entries(defaultSiteContent)) {
      insertContent.run(key, val);
    }
    console.log('[DB] Seeded default site content');
  }
}

// Initialize on require
initSchema();
seedData();

module.exports = {
  db,
  hashPassword
};
