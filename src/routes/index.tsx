import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { savePublicForm } from "@/lib/public-forms.functions";
import { getCoffeeNews, type NewsItem } from "@/lib/news.functions";
import { newsletterSchema, publicInquirySchema } from "@/lib/public-form-schemas";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ccakLogo from "@/assets/ccak-logo.png.asset.json";
import { PRODUCTS, kes, type CartItem } from "@/lib/shop/catalog";
import { CartLink, useShopCart } from "@/components/ShopCart";
import { useAccount } from "@/hooks/use-account";

const TITLE = "CCAK — Coffee Champions Association of Kenya";
const DESC =
  "Empowering farmers, elevating Kenyan coffee. Membership, training, county chapters and marketplace, all in one national coffee platform.";
const LOGO_URL =
  "https://codebase-migration-studio.lovable.app/__l5e/assets-v1/d605d211-e1e9-4aa2-9211-11a1ce4433fa/ccak-logo.png";
const OG_IMAGE = LOGO_URL;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: "Coffee Champions Association of Kenya",
  alternateName: "CCAK",
  url: "https://www.ccak.or.ke/",
  logo: LOGO_URL,
  description:
    "CCAK unites farmers, cooperatives, processors, exporters, researchers and government to build a coffee sector where every cherry picked builds a farmer's prosperity.",
  address: { "@type": "PostalAddress", addressLocality: "Nairobi", addressCountry: "KE" },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+254-703-424-972",
    email: "coffeechampionsassociation@gmail.com",
    contactType: "customer service",
  },
  sameAs: [
    "https://x.com/CCAK_ke",
    "https://www.tiktok.com/@CCAK_ke",
    "https://www.facebook.com/profile.php?id=61590921686608",
    "https://www.instagram.com/ccak_ke",
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      {
        name: "description",
        content:
          "The Coffee Champions Association of Kenya (CCAK) unites farmers, cooperatives, processors, exporters and government to build a coffee sector where every cherry picked builds a farmer's prosperity.",
      },
      { name: "theme-color", content: "#4E342E" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: TITLE },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://www.ccak.or.ke/" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:locale", content: "en_KE" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: "https://www.ccak.or.ke/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;500;600&display=swap",
      },
    ],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  }),
  component: Index,
});

const NAV = [
  ["#programs", "Programs"],
  ["#counties", "Counties"],
  ["#academy", "Academy"],
  ["#market", "Marketplace"],
  ["#membership", "Membership"],
  ["#news", "News"],
  ["#contact", "Contact"],
] as const;

const STATS = [
  [4820, "Members", 62],
  [27, "Counties", 56],
  [18, "Active projects", 70],
  [96000, "Farmers reached", 48],
  [312, "Coffee enterprises", 65],
  [140, "Funding mobilized (KES M)", 40],
] as const;

const PROGRAMS = [
  ["CW", "Coffee on Wheels", "Mobile processing and extension units bringing quality control directly to remote growing zones."],
  ["VA", "Value Addition Centre", "Shared roasting and packaging facilities that let cooperatives capture more of the export price."],
  ["FE", "Farmer Financial Empowerment", "Savings groups, input credit and insurance products built around the harvest calendar."],
  ["DP", "Coffee Digital Platform", "The member registry, traceability and market-data backbone underlying every CCAK program."],
  ["YC", "Youth Entrepreneurship Academy", "Training the next generation of agripreneurs in roasting, branding and export logistics."],
  ["WC", "Women in Coffee Enterprise", "Enterprise grants and mentorship for women-led cooperatives and processing businesses."],
  ["CS", "Climate Smart Coffee", "Shade-tree agroforestry, water-efficient washing stations and drought-resistant varietals."],
  ["EP", "Export Promotion", "Cupping labs, buyer matchmaking and certification support to open new international markets."],
] as const;

const COUNTIES = [
  { name: "Nyeri", members: 812, projects: 4, desc: "The heartland of Kenyan AA coffee, with the highest concentration of active washing stations." },
  { name: "Kirinyaga", members: 640, projects: 3, desc: "Home to the new Value Addition Centre and a fast-growing peaberry export line." },
  { name: "Murang'a", members: 398, projects: 2, desc: "Strong cooperative governance training uptake and youth entrepreneurship cohorts." },
  { name: "Kiambu", members: 355, projects: 2, desc: "Proximity to Nairobi makes this chapter the hub for buyer visits and cupping events." },
  { name: "Embu", members: 301, projects: 2, desc: "Leading climate-smart agroforestry pilot sites with shade-tree intercropping." },
  { name: "Meru", members: 410, projects: 3, desc: "High-altitude lots driving specialty-grade demand from international roasters." },
  { name: "Bungoma", members: 190, projects: 1, desc: "Emerging chapter focused on smallholder financial literacy and savings groups." },
  { name: "Kisii", members: 175, projects: 1, desc: "New chapter piloting mobile Coffee on Wheels processing routes." },
  { name: "Nandi", members: 230, projects: 2, desc: "Strong women-led enterprise groups active in wet-mill cooperatives." },
  { name: "Kericho", members: 260, projects: 2, desc: "Youth academy graduates opening the county's first specialty roastery." },
  { name: "Baringo", members: 120, projects: 1, desc: "Newly onboarded chapter with a focus on drought-resistant varietal trials." },
  { name: "Taita Taveta", members: 98, projects: 1, desc: "Coastal-adjacent chapter exploring export logistics through Mombasa." },
  { name: "Machakos", members: 140, projects: 1, desc: "Growing interest in value addition for the local urban specialty market." },
  { name: "Nairobi", members: 520, projects: 3, desc: "National secretariat, training academy studio and marketplace fulfilment hub." },
  { name: "Trans Nzoia", members: 150, projects: 1, desc: "Mixed farming county piloting intercropping with maize for smallholder resilience." },
];
const TOTAL_MEMBERS = COUNTIES.reduce((s, c) => s + c.members, 0);

const COURSES = [
  ["Coffee production & agronomy", "Soil health, pruning cycles and cherry selection.", 80, 12],
  ["Quality assurance & cupping", "Grading, defect detection and cup scoring.", 55, 9],
  ["Cooperative governance", "Leadership, transparency and member relations.", 40, 8],
  ["Export readiness", "Documentation, logistics and buyer relations.", 20, 10],
] as const;


const MODAL_COPY = {
  partner: { title: "Become a partner", sub: "Tell us about your organization and how you would like to work with CCAK." },
  donate: { title: "Support CCAK", sub: "Your contribution funds training, value addition and farmer grants." },
};
type ModalKind = keyof typeof MODAL_COPY;

const CHERRY_COLORS = ["#2E7D32", "#C9A227", "#8B4513"];

function Index() {
  const { data: account } = useAccount();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind | null>(null);
  const [formStatus, setFormStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const saveForm = useServerFn(savePublicForm);
  const openerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onResize = () => window.innerWidth > 680 && setMenuOpen(false);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const open = (kind: ModalKind) => (e: { currentTarget: HTMLElement }) => {
    openerRef.current = e.currentTarget;
    setMenuOpen(false);
    setFormStatus("");
    setModal(kind);
  };
  const close = () => {
    setModal(null);
    openerRef.current?.focus();
  };

  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    if (modal) focusables(modalRef.current)[0]?.focus();
  }, [modal]);

  const onModalKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") return close();
    if (e.key !== "Tab") return;
    const f = focusables(modalRef.current);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const onApply = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !modal) return;
    const form = e.currentTarget;
    const parsed = publicInquirySchema.safeParse({ ...Object.fromEntries(new FormData(form)), kind: modal });
    if (!parsed.success) return setFormStatus(parsed.error.issues[0]?.message ?? "Check your details.");
    setBusy(true); setFormStatus("");
    try {
      const result = await saveForm({ data: parsed.data });
      form.reset(); setFormStatus(result.message);
    } catch {
      setFormStatus("We could not save your inquiry. Please try again.");
    } finally { setBusy(false); }
  };

  const copy = MODAL_COPY[modal ?? "partner"];

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>

      <header id="siteHeader" className={scrolled ? "scrolled" : ""}>
        <div className="wrap">
          <nav aria-label="Primary">
            <a className="logo" href="#top">
              <img className="logo-mark" src={ccakLogo.url} alt="CCAK logo" />
              <span className="logo-text"><strong>Coffee Champions</strong><small>Association of Kenya</small></span>
            </a>
            <div className="nav-links">
              {NAV.map(([h, l]) => <a key={h} href={h}>{l}</a>)}
            </div>
            <div className="nav-cta">
              {account ? <Button asChild className="btn btn-forest btn-compact"><Link to="/membership">My membership</Link></Button> : <><Link to="/auth" className="btn btn-outline btn-compact">Member login</Link><Button asChild className="btn btn-forest btn-compact"><Link to="/auth" search={{ mode: "signup" }}>Join CCAK</Link></Button></>}
            </div>
            <button
              className="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="mobileMenu"
              aria-label="Open menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? "\u2715" : "\u2630"}
            </button>
          </nav>
          <div className={`mobile-menu${menuOpen ? " open" : ""}`} id="mobileMenu">
            {NAV.map(([h, l]) => <a key={h} href={h} onClick={() => setMenuOpen(false)}>{l}</a>)}
            <div className="mobile-cta">
              {account ? <Button asChild className="btn btn-forest"><Link to="/membership">My membership</Link></Button> : <><Button asChild variant="ghost" className="btn btn-ghost"><Link to="/auth">Member login</Link></Button><Button asChild className="btn btn-forest"><Link to="/auth" search={{ mode: "signup" }}>Join CCAK</Link></Button></>}
            </div>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="top">
          <CherryField />
          <div className="wrap">
            <p className="hero-eyebrow">Coffee Revolution 2035 · National Coffee Platform</p>
            <h1>Empowering farmers.<br />Elevating <em>Kenyan coffee</em>.<br />Transforming the future.</h1>
            <p className="lead">CCAK unites farmers, cooperatives, processors, exporters, researchers and government to build a coffee sector where every cherry picked builds a farmer's prosperity.</p>
            <div className="hero-actions">
              <Button asChild className="btn btn-gold"><Link to="/auth" search={{ mode: "signup" }}>Join CCAK</Link></Button>
              <button type="button" className="btn btn-outline" onClick={open("partner")}>Become a partner</button>
              <button type="button" className="btn btn-outline" onClick={open("donate")}>Donate</button>
              <a className="btn btn-outline" href="#programs">Explore projects</a>
            </div>
            <p className="hero-scroll"><span className="hero-scroll-line" aria-hidden="true" />Scroll to explore impact</p>
          </div>
        </section>

        <Stats />

        <section className="mission" id="about" aria-labelledby="mission-heading">
          <h2 id="mission-heading" className="visually-hidden">Our mission and vision</h2>
          <div className="wrap mission-grid">
            <div className="mission-card">
              <span className="mission-tag">Our mission</span>
              <h3>Unite, empower, finance, industrialize.</h3>
              <p>We unite, empower, finance, industrialize and globally position Kenya's coffee sector through innovation, value addition, research, strategic partnerships and sustainable enterprise — from the smallholder farm gate to the export market.</p>
            </div>
            <div className="mission-card">
              <span className="mission-tag">Our vision</span>
              <h3>Kenya's coffee, the world's most respected brand.</h3>
              <p>We work toward a future where Kenyan coffee is recognized as the world's most respected agricultural brand, and where every coffee farmer — regardless of county, gender or age — prospers from their harvest.</p>
            </div>
          </div>
        </section>

        <section className="programs" id="programs" aria-labelledby="programs-heading">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">Flagship programs</p>
                <h2 id="programs-heading">Eight initiatives moving the sector forward</h2>
              </div>
              <p className="section-note">Every program pairs a field-level intervention with digital tools — tracked from budget to farmer impact.</p>
            </div>
            <ul className="program-grid">
              {PROGRAMS.map(([ic, t, d]) => (
                <li key={t} className="program-card">
                  <span className="program-icon" aria-hidden="true">{ic}</span>
                  <h3>{t}</h3><p>{d}</p><span className="go">View program →</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Counties />

        <section className="academy" id="academy" aria-labelledby="academy-heading">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">Training academy</p>
                <h2 id="academy-heading">Certified learning, from seedling to sale</h2>
              </div>
              <p className="section-note">Video lessons, assignments and quizzes lead to a verifiable CCAK certificate.</p>
            </div>
            <ul className="course-grid">
              {COURSES.map(([t, d, p, n]) => (
                <li key={t} className="course-card">
                  <h3>{t}</h3><p>{d}</p>
                  <div className="course-track">
                    <i style={{ ["--progress" as string]: `${p}%` }} role="img" aria-label={`${p}% complete`} />
                  </div>
                  <div className="course-meta">{n} lessons · Certificate</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="market" id="market" aria-labelledby="market-heading">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">Marketplace</p>
                <h2 id="market-heading">Shop the harvest, fund the mission</h2>
              </div>
              <div><p className="section-note">Every purchase channels margin back to member cooperatives.</p><CartLink /></div>
            </div>
            <ul className="market-grid">
              {PRODUCTS.map((product) => (
                <li key={product.id} className="product-card">
                  <div className="product-media" aria-hidden="true"><span>{product.tag}</span></div>
                  <div className="product-body"><h3>{product.name}</h3><p className="price">{kes(product.price)}</p><AddToCart id={product.id} /></div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="membership" id="membership" aria-labelledby="membership-heading">
          <div className="wrap mem-layout">
            <figure className="card-3d" aria-label="Sample CCAK digital membership card for Grace Wanjiru, Nyeri chapter">
              <div className="card-top">
                <div className="card-org">CCAK<small>Digital membership card</small></div>
                <div className="qr" aria-hidden="true" />
              </div>
              <div className="card-name">Grace Wanjiru</div>
              <div className="card-code">CCAK–C012–0347</div>
              <div className="card-bottom"><span>Nyeri chapter</span><span>Active since 2024</span></div>
            </figure>
            <div>
              <p className="eyebrow">Membership portal</p>
              <h2 id="membership-heading" className="mem-heading">One login for every member service</h2>
              <p className="mem-copy">A secure dashboard for training records, renewals, certificates and county chapter directories — verified in the field with a scan of the QR code.</p>
              <div className="mem-features">
                {[
                  ["Unique member ID", "Format CCAK–C0##–#### tied to county and join order."],
                  ["Renewals & payments", "M-Pesa, card and bank history in one statement."],
                  ["Certificates", "Download every academy completion on demand."],
                  ["QR verification", "Field officers confirm status instantly at events."],
                ].map(([t, d]) => (
                  <div key={t} className="mem-feat"><span className="dot" aria-hidden="true" /><div><h3>{t}</h3><p>{d}</p></div></div>
                ))}
              </div>
              <Button asChild className="btn btn-forest mem-cta"><Link to="/auth" search={{ mode: "signup" }}>Create your account</Link></Button>
            </div>
          </div>
        </section>

        <section className="news" id="news" aria-labelledby="news-heading">
          <div className="wrap">
            <div className="section-head">
              <div><p className="eyebrow">Newsroom</p><h2 id="news-heading">Kenyan coffee sector updates</h2><p>Live updates from verified government agencies and trusted Kenyan news outlets.</p></div>
              <a className="btn btn-ghost" href="https://www.afa.go.ke/" target="_blank" rel="noopener noreferrer">AFA Coffee Directorate →</a>
            </div>
            <CoffeeNews />
          </div>
        </section>

        <section className="partners" aria-labelledby="partners-heading">
          <h2 id="partners-heading" className="visually-hidden">Our partners</h2>
          <div className="wrap partner-row">
            <span>AGRICULTURE &amp; FOOD AUTHORITY</span><span>ICO</span><span>KENYA COFFEE EXPORTERS ASSOC.</span>
            <span>COUNTY GOVERNMENTS</span><span>DEVELOPMENT PARTNERS NETWORK</span>
          </div>
        </section>

        <section className="testimonials" aria-labelledby="testimonials-heading">
          <div className="wrap">
            <p className="eyebrow">Member voices</p>
            <h2 id="testimonials-heading">What the network is saying</h2>
            <div className="test-grid">
              {[
                ["Since joining our Nyeri chapter, our cooperative doubled the price we get for parchment through direct buyer contact.", "JM", "James Mwangi", "Cooperative chair, Nyeri"],
                ["The Women in Coffee grant let us buy our own pulping machine instead of sharing one three villages away.", "SN", "Susan Nyambura", "Enterprise lead, Kirinyaga"],
                ["The academy certificate opened the door to my first export contract as a 24-year-old roaster.", "DK", "David Kiptoo", "Youth entrepreneur, Kericho"],
              ].map(([q, i, n, r]) => (
                <blockquote key={n} className="test-card">
                  <p>“{q}”</p>
                  <footer className="test-who">
                    <span className="test-avatar" aria-hidden="true">{i}</span>
                    <cite><span className="test-who-name">{n}</span><small>{r}</small></cite>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <Newsletter />
      </main>

      <footer id="contact">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo"><img className="logo-mark" src={ccakLogo.url} alt="CCAK logo" /><span className="logo-text"><strong>Coffee Champions</strong><small>Association of Kenya</small></span></div>
              <p>Coffee Champions Association of Kenya. Uniting the sector from farm gate to global market.</p>
              <div className="social-row">
                <a href="https://www.facebook.com/profile.php?id=61590921686608" target="_blank" rel="noopener noreferrer" aria-label="CCAK on Facebook">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M13.5 21.9v-8.4h2.8l.4-3.3h-3.2V8.2c0-.9.3-1.6 1.7-1.6h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.6H7.5v3.3h2.9v8.4a10 10 0 0 0 3.1 0z"/></svg>
                </a>
                <a href="https://x.com/CCAK_ke" target="_blank" rel="noopener noreferrer" aria-label="CCAK on X">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.9 3h3.1l-6.8 7.8L22.2 21h-6.3l-4.9-6.4L5.4 21H2.3l7.3-8.3L2 3h6.4l4.4 5.9L17.9 3zm-1.1 16.1h1.7L7.5 4.8H5.7l11.1 14.3z"/></svg>
                </a>
                <a href="https://www.instagram.com/ccak_ke" target="_blank" rel="noopener noreferrer" aria-label="CCAK on Instagram">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none"/></svg>
                </a>
                <a href="https://www.tiktok.com/@CCAK_ke" target="_blank" rel="noopener noreferrer" aria-label="CCAK on TikTok">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.6 3c.4 2.1 1.7 3.4 3.9 3.6v3c-1.5 0-2.8-.5-3.9-1.3v6.3c0 3.6-2.4 6-5.7 6-3 0-5.3-2.2-5.3-5.2 0-3 2.4-5.3 5.6-5.2v3.1c-1.4-.2-2.5.6-2.5 2 0 1.3 1 2.2 2.3 2.2 1.5 0 2.5-1.1 2.5-2.9V3h3.1z"/></svg>
                </a>
              </div>
            </div>
            <nav aria-label="Organization"><h2>Organization</h2><ul><li><a href="#about">Our story</a></li><li><a href="#">Leadership</a></li><li><a href="#">Governance</a></li><li><a href="#">Constitution</a></li></ul></nav>
            <nav aria-label="Get involved"><h2>Get involved</h2><ul><li><Link to="/auth" search={{ mode: "signup" }}>Membership</Link></li><li><Button variant="link" onClick={open("partner")}>Partner with us</Button></li><li><a href="#">Careers</a></li><li><a href="#">Volunteer</a></li></ul></nav>
            <nav aria-label="Resources"><h2>Resources</h2><ul><li><a href="#">Coffee library</a></li><li><a href="#news">News</a></li><li><a href="#">Events</a></li><li><a href="#academy">Training</a></li></ul></nav>
            <div><h2>Contact</h2><ul><li>Nairobi, Kenya</li><li><a href="tel:+254703424972">+254 703 424 972</a></li><li><a href="mailto:coffeechampionsassociation@gmail.com">coffeechampionsassociation@gmail.com</a></li></ul></div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Coffee Champions Association of Kenya. All rights reserved.</span>
            <span>Coffee Revolution 2035</span>
          </div>
        </div>
      </footer>

      <div
        className={`modal-backdrop${modal ? " open" : ""}`}
        aria-hidden={!modal}
        onClick={(e) => e.target === e.currentTarget && close()}
        onKeyDown={onModalKey}
      >
        <div className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modalTitle" aria-describedby="modalSub">
          <Button variant="ghost" size="icon" className="modal-close" aria-label="Close dialog" onClick={close} disabled={busy}>×</Button>
          <h3 id="modalTitle">{copy.title}</h3>
          <p className="sub" id="modalSub">{copy.sub}</p>
          <form onSubmit={onApply}>
            <label htmlFor="appName">Full name</label>
            <input id="appName" name="full_name" type="text" autoComplete="name" maxLength={120} required />
            <label htmlFor="appCounty">County</label>
            <select id="appCounty" name="county">
              {["Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Embu", "Meru", "Bungoma", "Kisii"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <label htmlFor="appEmail">Email</label>
            <input id="appEmail" name="email" type="email" autoComplete="email" maxLength={255} required />
            <label htmlFor="appPhone">Phone</label>
            <input id="appPhone" name="phone" type="tel" placeholder="07xx xxx xxx" autoComplete="tel" maxLength={20} required />
            <label htmlFor="appMessage">Message</label>
            <textarea id="appMessage" name="message" maxLength={1000} rows={3} />
            <label htmlFor="appCompany" className="hp-field" aria-hidden="true">Leave this field empty</label>
            <input id="appCompany" name="company_website" type="text" className="hp-field" tabIndex={-1} autoComplete="off" />
            <Button className="btn btn-forest" type="submit" disabled={busy}>{busy ? "Saving…" : "Send inquiry"}</Button>
          </form>
          <p className="modal-note" role="status">{formStatus}</p>
        </div>
      </div>
    </>
  );
}

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function CherryField() {
  const [cherries, setCherries] = useState<React.CSSProperties[]>([]);
  useEffect(() => {
    setCherries(
      Array.from({ length: 26 }, () => {
        const size = 6 + Math.random() * 10;
        return {
          width: size, height: size,
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          background: CHERRY_COLORS[Math.floor(Math.random() * 3)],
          opacity: 0.15 + Math.random() * 0.25,
        };
      }),
    );
  }, []);
  return (
    <div className="hero-cherries" aria-hidden="true">
      {cherries.map((s, i) => <div key={i} className="cherry" style={s} />)}
    </div>
  );
}

function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      obs.disconnect();
      setVisible(true);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setProgress(1);
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / 1400, 1);
        setProgress(1 - Math.pow(1 - p, 3));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <section className="stats" aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="visually-hidden">CCAK impact statistics</h2>
      <div className="wrap">
        <div className="stats-grid" ref={ref}>
          {STATS.map(([n, l, f]) => (
            <div key={l} className="stat">
              <div className="stat-num">{Math.round(n * progress).toLocaleString()}</div>
              <div className="stat-label">{l}</div>
              <div className="ripen-track"><div className="ripen-fill" style={{ width: visible ? `${f}%` : "0%" }} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Counties() {
  const [active, setActive] = useState<number | null>(null);
  const c = active === null ? null : COUNTIES[active];
  return (
    <section className="counties" id="counties" aria-labelledby="counties-heading">
      <div className="wrap county-layout">
        <div>
          <p className="eyebrow">County chapters</p>
          <h2 id="counties-heading" className="county-heading">A schematic view of CCAK's county network</h2>
          <ul className="hex-grid" aria-label="Select a county chapter to view its details">
            {COUNTIES.map((co, i) => (
              <li key={co.name}>
                <button
                  type="button"
                  className={`hex${active === i ? " active" : ""}`}
                  aria-pressed={active === i}
                  aria-label={`${co.name} chapter, ${co.members} members`}
                  onClick={() => setActive(i)}
                >
                  <span className="hex-count" aria-hidden="true">{co.members}</span>
                  <span className="hex-name" aria-hidden="true">{co.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="county-info" aria-live="polite">
          {c ? (
            <>
              <h4>{c.name} chapter</h4>
              <p>{c.desc}</p>
              <div className="county-meta">
                <div><span>{c.members}</span><small>Members</small></div>
                <div><span>{c.projects}</span><small>Active projects</small></div>
                <div><span>{((c.members / TOTAL_MEMBERS) * 100).toFixed(0)}%</span><small>Of network</small></div>
              </div>
            </>
          ) : (
            <>
              <h3>Select a county</h3>
              <p>Click any hexagon to view that chapter's leadership, membership and active projects.</p>
              <div className="county-meta">
                <div><span>27</span><small>Chapters live</small></div>
                <div><span>4,820</span><small>Members</small></div>
                <div><span>18</span><small>Projects running</small></div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function AddToCart({ id }: { id: CartItem["id"] }) {
  const [added, setAdded] = useState(false);
  const cart = useShopCart();
  return (
    <Button variant="ghost"
      className={`btn btn-ghost add-cart${added ? " btn-forest" : ""}`}
      type="button"
      aria-live="polite"
      onClick={() => { cart.add(id); setAdded(true); setTimeout(() => setAdded(false), 1200); }}
    >
      {added ? "Added" : "Add to cart"}
    </Button>
  );
}

const OFFICIAL_SOURCES = [
  { name: "AFA Coffee Directorate", url: "https://www.afa.go.ke/", note: "Regulation, licensing and production statistics" },
  { name: "Nairobi Coffee Exchange", url: "https://www.nce.co.ke/", note: "Weekly auction prices and volumes" },
  { name: "KALRO Coffee Research Institute", url: "https://www.kalro.org/coffee/", note: "Varieties, pest and disease advisories" },
  { name: "Ministry of Agriculture", url: "https://kilimo.go.ke/", note: "Coffee policy, reforms and farmer support" },
];

function CoffeeNews() {
  const fetchNews = useServerFn(getCoffeeNews);
  const [items, setItems] = useState<NewsItem[] | null>(null);
  useEffect(() => {
    fetchNews().then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);
  return (
    <>
      <div className="news-grid">
        {items === null && <p>Loading latest coffee updates…</p>}
        {items?.map((n, i) => (
          <article key={n.link} className={`news-card${i === 0 ? " feature" : ""}`}>
            <div className="news-media" aria-hidden="true" />
            <div className="news-body">
              <span className="news-tag">{n.source}</span>
              <h3><a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a></h3>
              {n.date && <p className="news-date"><time dateTime={new Date(n.date).toISOString()}>{new Date(n.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</time></p>}
            </div>
          </article>
        ))}
        {items?.length === 0 && OFFICIAL_SOURCES.map((s) => (
          <article key={s.url} className="news-card">
            <div className="news-media" aria-hidden="true" />
            <div className="news-body">
              <span className="news-tag">Official source</span>
              <h3><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></h3>
              <p className="news-date">{s.note}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Newsletter() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const saveForm = useServerFn(savePublicForm);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const parsed = newsletterSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) return setStatus(parsed.error.issues[0]?.message ?? "Check your email.");
    setBusy(true); setStatus("");
    try {
      const result = await saveForm({ data: { kind: "newsletter", ...parsed.data } });
      form.reset(); setStatus(result.message);
    } catch { setStatus("We could not save your subscription. Please try again."); }
    finally { setBusy(false); }
  };
  return (
    <section className="cta-band" aria-labelledby="newsletter-heading">
      <div className="wrap">
        <h2 id="newsletter-heading">Stay close to the harvest</h2>
        <p>Monthly briefings on prices, grants and county chapter news — straight to your inbox.</p>
        <form className="newsletter-form" onSubmit={onSubmit}>
          <label htmlFor="newsletterEmail" className="visually-hidden">Email address</label>
          <input id="newsletterEmail" name="email" type="email" placeholder="you@email.com" autoComplete="email" maxLength={255} required />
          <label htmlFor="newsletterCompany" className="hp-field" aria-hidden="true">Leave this field empty</label>
          <input id="newsletterCompany" name="company_website" type="text" className="hp-field" tabIndex={-1} autoComplete="off" />
          <Button className="btn btn-gold" type="submit" disabled={busy}>{busy ? "Saving…" : "Subscribe"}</Button>
        </form>
        <p className="newsletter-status" role="status">{status}</p>
      </div>
    </section>
  );
}
