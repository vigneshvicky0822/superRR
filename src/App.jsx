
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Menu,
  X,
  ChevronRight,
  ArrowUpRight,
  Trophy,
  Activity,
  Target,
  Users,
  BarChart3,
  Shield,
  Flame,
} from 'lucide-react'

import Batting from './pages/Batting'
import Bowling from './pages/Bowling'
import PlayerProfile from './pages/PlayerProfile'
import './App.css'

const stats = [
  { label: 'MATCHES ANALYSED', value: '853', icon: Trophy },
  { label: 'DELIVERIES', value: '193K', icon: Activity },
  { label: 'ELIGIBLE BATTERS', value: '69', icon: Target },
  { label: 'ELIGIBLE BOWLERS', value: '127', icon: Users },
]

const sections = [
  {
    number: '01',
    title: 'Batting Intelligence',
    subtitle: 'Discover batters who perform under pressure.',
    image: '/images/banners/batting-banner.png',
    label: 'EXPLORE BATTERS',
    link: '/batting',
    category: 'BATTING ANALYTICS',
  },
  {
    number: '02',
    title: 'Bowling Intelligence',
    subtitle: 'Explore the bowlers who control pressure situations.',
    image: '/images/banners/bowling-banner.png',
    label: 'EXPLORE BOWLERS',
    link: '/bowling',
    category: 'BOWLING ANALYTICS',
  },
]

const playerImages = {
  batting: {
    'Naman Dhir': 'naman-dhir.png',
    'Dhruv Jurel': 'dhruv-jurel.png',
    'Dinesh Karthik': 'dinesh-karthik.png',
    'Ashutosh Sharma': 'ashutosh-sharma.png',
    'Tim David': 'tim-david.png',
    'Sikandar Raza': 'sikandar-raza.png',
    'Aiden Markram': 'aiden-markram.png',
    'Suryakumar Yadav': 'suryakumar-yadav.png',
    'Jitesh Sharma': 'jitesh-sharma.png',
    'Namboori Tilak Varma': 'tilak-varma.png',
  },
  bowling: {
    'Abrar Ahmed': 'abrar-ahmed.png',
    'Mohammad Nawaz': 'mohammad-nawaz.png',
    'Sunil Narine': 'sunil-narine.png',
    'Jasprit Bumrah': 'jasprit-bumrah.png',
    'Akeal Hosein': 'akeal-hosein.png',
    'Mustafizur Rahman': 'mustafizur-rahman.png',
    'Mohammad Wasim': 'mohammad-wasim.png',
    'Jamie Overton': 'jamie-overton.png',
    'Shadab Khan': 'shadab-khan.png',
    'Salman Mirza': 'salman-mirza.png',
  },
}

function parseCSVLine(line) {
  const values = []
  let value = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"' && line[i + 1] === '"' && quoted) {
      value += '"'
      i++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += char
    }
  }

  values.push(value.trim())
  return values
}

function parseCSV(csv) {
  const lines = csv.trim().split(/\r?\n/)
  if (!lines.length) return []

  const headers = parseCSVLine(lines[0])

  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCSVLine(line)

    return Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] ?? '',
      ])
    )
  })
}

function formatMetric(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '—'
}

function FeaturedPlayerCard({ player, category, index }) {
  const isBatting = category === 'batting'
  const name = isBatting ? player.striker_name : player.bowler_name
  const playerId = isBatting ? player.striker_id : player.bowler_id
  const imageName = playerImages[category][name]

  const primaryMetric = isBatting
    ? player.runs_above_average_per_100_balls
    : player.runs_saved_per_6_balls

  const primaryLabel = isBatting
    ? 'RUNS ABOVE BASELINE / 100 BALLS'
    : 'RUNS SAVED / 6 BALLS'

  const secondaryLabel = isBatting
    ? 'STRIKE RATE'
    : 'ECONOMY RATE'

  const secondaryMetric = isBatting
    ? player.pressure_strike_rate
    : player.pressure_economy

  return (
    <motion.article
      className="featured-player-card"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
    >
      <Link
        to={`/player/${category}/${encodeURIComponent(playerId)}`}
        className="featured-player-link"
      >
        <div className="featured-player-image">
          {imageName ? (
            <img
              src={`/images/${isBatting ? 'players' : 'bowlers'}/${imageName}`}
              alt={name}
              loading="lazy"
            />
          ) : (
            <div className="featured-player-placeholder">
              <Users size={38} />
            </div>
          )}

          <span className="featured-player-rank">
            #{String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="featured-player-info">
          <span className="featured-player-category">
            {isBatting ? 'PRESSURE BATTER' : 'PRESSURE BOWLER'}
          </span>

          <h3>{name}</h3>

          <div className="featured-player-metrics">
            <div>
              <span>{primaryLabel}</span>
              <strong>{formatMetric(primaryMetric)}</strong>
            </div>

            <div>
              <span>{secondaryLabel}</span>
              <strong>{formatMetric(secondaryMetric)}</strong>
            </div>
          </div>

          <div className="featured-player-footer">
            <span>VIEW PLAYER PROFILE</span>
            <ArrowUpRight size={17} />
          </div>
        </div>
      </Link>
    </motion.article>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [featuredBatters, setFeaturedBatters] = useState([])
  const [featuredBowlers, setFeaturedBowlers] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    let cancelled = false

    async function loadFeaturedPlayers() {
      try {
        const [battingResponse, bowlingResponse] = await Promise.all([
          fetch('/data/batting_best10.csv'),
          fetch('/data/bowling_best10.csv'),
        ])

        if (!battingResponse.ok || !bowlingResponse.ok) {
          throw new Error('Unable to load ranking data')
        }

        const [battingCSV, bowlingCSV] = await Promise.all([
          battingResponse.text(),
          bowlingResponse.text(),
        ])

        const batters = parseCSV(battingCSV).slice(0, 3)
        const bowlers = parseCSV(bowlingCSV).slice(0, 3)

        if (!cancelled) {
          setFeaturedBatters(batters)
          setFeaturedBowlers(bowlers)
        }
      } catch (error) {
        console.error('Featured player data could not be loaded:', error)
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    loadFeaturedPlayers()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="website">
      {/* NAVIGATION */}
      <header className="navbar">
        <Link className="brand" to="/" onClick={closeMenu}>
          SUPERR<span>.</span>
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <Link to="/" onClick={closeMenu}>HOME</Link>
          <Link to="/batting" onClick={closeMenu}>BATTING</Link>
          <Link to="/bowling" onClick={closeMenu}>BOWLING</Link>
          <a href="#insights" onClick={closeMenu}>INSIGHTS</a>
          <a href="#about" onClick={closeMenu}>ABOUT</a>
        </nav>

        <div className="season-label">2022 — 2026</div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hero-overlay" />

          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="eyebrow">
              CRICKET PERFORMANCE INTELLIGENCE
            </span>

            <h1>
              THE GAME
              <br />
              UNDER <span>PRESSURE.</span>
            </h1>

            <p>
              Beyond traditional scorecards. Explore batting and bowling
              performance through data-driven pressure analysis across
              high-intensity T20 cricket.
            </p>

            <div className="hero-actions">
              <a className="primary-button" href="#rankings">
                EXPLORE ANALYTICS <ChevronRight size={18} />
              </a>

              <Link className="hero-secondary-button" to="/batting">
                VIEW PLAYER RANKINGS <ArrowUpRight size={17} />
              </Link>
            </div>
          </motion.div>

          <div className="hero-footer">
            <span>IPL &amp; MEN'S T20I</span>
            <span>DATA PERIOD: 2022–2026</span>
          </div>
        </section>

        {/* OVERVIEW */}
        <section className="stats-section" id="insights">
          <div className="section-heading">
            <span>01 / PROJECT OVERVIEW</span>
            <h2>THE NUMBERS BEHIND THE GAME</h2>
            <p>
              An overview of the cricket data used in our pressure-performance
              analysis.
            </p>
          </div>

          <div className="stats-grid">
            {stats.map((stat, index) => {
              const Icon = stat.icon

              return (
                <motion.div
                  className="stat-card"
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Icon size={23} />
                  <h3>{stat.value}</h3>
                  <p>{stat.label}</p>
                </motion.div>
              )
            })}
          </div>

          <div className="overview-note">
            <Shield size={17} />
            <p>
              Rankings are based on the available pressure-performance
              methodology and eligibility criteria.
            </p>
          </div>
        </section>

        {/* ANALYTICS CATEGORIES */}
        <section className="rankings-section" id="rankings">
          <div className="section-heading">
            <span>02 / ANALYTICS MODULES</span>
            <h2>EXPLORE PLAYER INTELLIGENCE</h2>
            <p>
              Explore two dimensions of T20 performance through dedicated
              analytical modules.
            </p>
          </div>

          <div className="category-grid">
            {sections.map((section, index) => (
              <motion.article
                className="category-card"
                key={section.title}
                whileHover={{ y: -6 }}
              >
                <img src={section.image} alt={section.title} />

                <div className="category-overlay">
                  <span>{section.number} / {section.category}</span>
                  <h3>{section.title}</h3>
                  <p>{section.subtitle}</p>

                  <Link className="text-button" to={section.link}>
                    {section.label} <ChevronRight size={17} />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* FEATURED BATTERS */}
        <section className="featured-section">
          <div className="featured-section-heading">
            <div>
              <span>03 / BATTING INTELLIGENCE</span>
              <h2>FEATURED PRESSURE BATTERS</h2>
              <p>
                Leading batters from the available pressure-performance
                ranking.
              </p>
            </div>

            <Link to="/batting" className="section-action">
              FULL BATTING RANKINGS <ArrowUpRight size={17} />
            </Link>
          </div>

          {dataLoading ? (
            <p className="featured-loading">Loading batting performers...</p>
          ) : featuredBatters.length > 0 ? (
            <div className="featured-grid">
              {featuredBatters.map((player, index) => (
                <FeaturedPlayerCard
                  key={player.striker_id || index}
                  player={player}
                  category="batting"
                  index={index}
                />
              ))}
            </div>
          ) : (
            <p className="featured-loading">
              Batting ranking data is currently unavailable.
            </p>
          )}
        </section>

        {/* FEATURED BOWLERS */}
        <section className="featured-section featured-bowling-section">
          <div className="featured-section-heading">
            <div>
              <span>04 / BOWLING INTELLIGENCE</span>
              <h2>FEATURED PRESSURE BOWLERS</h2>
              <p>
                Leading bowlers from the available pressure-performance
                ranking.
              </p>
            </div>

            <Link to="/bowling" className="section-action">
              FULL BOWLING RANKINGS <ArrowUpRight size={17} />
            </Link>
          </div>

          {dataLoading ? (
            <p className="featured-loading">Loading bowling performers...</p>
          ) : featuredBowlers.length > 0 ? (
            <div className="featured-grid">
              {featuredBowlers.map((player, index) => (
                <FeaturedPlayerCard
                  key={player.bowler_id || index}
                  player={player}
                  category="bowling"
                  index={index}
                />
              ))}
            </div>
          ) : (
            <p className="featured-loading">
              Bowling ranking data is currently unavailable.
            </p>
          )}
        </section>

        {/* ABOUT */}
        <section className="about-section" id="about">
          <span>05 / ABOUT THE PLATFORM</span>
          <h2>DATA MEETS THE GAME.</h2>

          <p>
            SupeRR Analytics is an independent cricket analytics project
            studying individual batting and bowling performance under
            pressure across IPL and Men's T20 International cricket.
          </p>

          <div className="about-highlights">
            <div>
              <BarChart3 size={22} />
              <strong>DATA-DRIVEN</strong>
              <span>Evidence-based performance analysis</span>
            </div>

            <div>
              <Flame size={22} />
              <strong>PRESSURE-FOCUSED</strong>
              <span>Performance in demanding situations</span>
            </div>

            <div>
              <Target size={22} />
              <strong>PLAYER-CENTRIC</strong>
              <span>Individual ranking and analysis</span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div>
          <Link className="brand" to="/">
            SUPERR<span>.</span>
          </Link>
          <p>CRICKET PERFORMANCE ANALYTICS · 2026</p>
        </div>

        <div className="footer-links">
          <Link to="/batting">BATTING</Link>
          <Link to="/bowling">BOWLING</Link>
          <a href="#about">ABOUT</a>
        </div>

        <span className="footer-caption">
          BUILT AROUND THE GAME. POWERED BY DATA.
        </span>
      </footer>
    </div>
  )
}

function Website() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/batting" element={<Batting />} />
        <Route path="/bowling" element={<Bowling />} />
        <Route
          path="/player/:category/:playerId"
          element={<PlayerProfile />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default Website
