import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Navbar from "./Navbar/Navbar";
import WarpText from "./components/ReactBits/WarpText";
import CurvedLoop from "./components/ReactBits/CurvedLoop";
import ScrambledText from "./components/ReactBits/ScrambledText";
import { sanityClient, galleryPhotosQuery, videoThumbnailsQuery, contactUsVideoQuery } from "./lib/sanity";
import { sanityImageUrl } from "./lib/sanityImage";
import "./ContactPage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const INQUIRY_TYPES = [
    { id: "collaborate", label: "Film Collaboration", helper: "WANT TO ACT, DIRECT, EDIT, OR CREATE WITH OUR CLUB?" },
    { id: "script", label: "Script / Idea Pitch", helper: "GOT A NARRATIVE OR FILM CONCEPT TO PITCH?" },
    { id: "production", label: "Club Production", helper: "CONNECT ABOUT OUR UPCOMING FILM PROJECTS." },
    { id: "workshop", label: "Workshops & Learning", helper: "EXPLORE FILMMAKING WORKSHOPS AND SESSIONS." },
    { id: "partnership", label: "Creative Partnership", helper: "COLLABORATE WITH NEON ON ARTISTIC IDEAS." },
    { id: "general", label: "General Inquiry", helper: "TELL US WHAT'S ON YOUR MIND." }
];

const FAQS = [
    {
        q: "What kind of projects does Neon Cinematics focus on?",
        a: "As the official cinematography and filmmaking club of IIIT Kota, we create independent short films, narrative projects, cinematic visual experiments, and behind-the-scenes content."
    },
    {
        q: "How can I collaborate with Neon on a film or pitch an idea?",
        a: "You can submit your script concept, idea, or collaboration proposal through our contact form or email us at neoncinematic@iiitkota.ac.in. We welcome writers, actors, directors, editors, and visionaries!"
    },
    {
        q: "Does Neon provide commercial studio or event coverage services?",
        a: "No. Neon Cinematics is an artistic filmmaking club, not a commercial studio or event videography agency. We focus purely on creative storytelling, member-led film productions, and artistic collaborations."
    },
    {
        q: "Where can I watch Neon's films and updates?",
        a: "Check out our Selected Work gallery, read articles on our Blog, or follow our journey on Instagram (@neoncinematics) and YouTube (@neonfilmandmaking)."
    }
];

export default function ContactPage() {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const formRef = useRef(null);
    const nameInputRef = useRef(null);

    // Form state
    const [selectedType, setSelectedType] = useState("collaborate");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });
    const [status, setStatus] = useState("idle");
    const [statusMsg, setStatusMsg] = useState("");

    // Media & Showcase state
    const [showcaseWork, setShowcaseWork] = useState([]);
    const [bgVideo, setBgVideo] = useState(null);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);

    // Fetch work showcase & background video
    useEffect(() => {
        const fetchMedia = async () => {
            if (!sanityClient) return;
            try {
                const [photos, videos, videoData] = await Promise.all([
                    sanityClient.fetch(galleryPhotosQuery).catch(() => []),
                    sanityClient.fetch(videoThumbnailsQuery).catch(() => []),
                    sanityClient.fetch(contactUsVideoQuery).catch(() => null)
                ]);

                if (videoData?.videoUrl) {
                    setBgVideo(videoData.videoUrl);
                }

                const items = [];
                if (photos && photos.length > 0) {
                    items.push(...photos.slice(0, 3).map(p => ({
                        id: p._id,
                        title: p.title || "Cinematic Frame",
                        type: "Photography",
                        image: p.image,
                        link: "/work"
                    })));
                }
                if (videos && videos.length > 0) {
                    items.push(...videos.slice(0, 3).map(v => ({
                        id: v._id,
                        title: v.caption || "Showcase Production",
                        type: "Film",
                        image: v.image,
                        link: "/work"
                    })));
                }
                setShowcaseWork(items.slice(0, 4));
            } catch (e) {
                console.warn("Could not fetch media data:", e);
            }
        };
        fetchMedia();
    }, []);

    // GSAP Page Animations & Route Snap Transitions
    useGSAP(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);

        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 1.2, ease: "power2.out" }
        );

        gsap.fromTo(".contact-hero__title-wrapper",
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, delay: 0.2, ease: "power3.out" }
        );

        gsap.fromTo(".contact-hero__sub",
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, delay: 0.4, ease: "power3.out" }
        );

        let isTransitioning = false;

        const handleScroll = (e) => {
            if (isTransitioning) return;
            const scrollPos = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

            // Scroll UP from top -> navigate to /aboutUs
            if (e.deltaY < 0 && scrollPos <= 4) {
                e.preventDefault();
                isTransitioning = true;
                gsap.to(containerRef.current, {
                    opacity: 0,
                    duration: 0.5,
                    ease: "power2.inOut",
                    onComplete: () => navigate("/aboutUs")
                });
            }
            // Scroll DOWN past bottom -> navigate to /blog
            else if (e.deltaY > 0 && scrollPos >= maxScroll - 4) {
                e.preventDefault();
                isTransitioning = true;
                gsap.to(containerRef.current, {
                    opacity: 0,
                    duration: 0.5,
                    ease: "power2.inOut",
                    onComplete: () => navigate("/blog")
                });
            }
        };

        let startY = 0;
        const handleTouchStart = (e) => { startY = e.touches[0].clientY; };
        const handleTouchMove = (e) => {
            if (isTransitioning) return;
            const delta = e.touches[0].clientY - startY;
            const scrollPos = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

            if (delta > 60 && scrollPos <= 4) {
                e.preventDefault();
                isTransitioning = true;
                gsap.to(containerRef.current, {
                    opacity: 0, duration: 0.5, ease: "power2.inOut",
                    onComplete: () => navigate("/aboutUs")
                });
            } else if (delta < -60 && scrollPos >= maxScroll - 4) {
                e.preventDefault();
                isTransitioning = true;
                gsap.to(containerRef.current, {
                    opacity: 0, duration: 0.5, ease: "power2.inOut",
                    onComplete: () => navigate("/blog")
                });
            }
        };

        window.addEventListener("wheel", handleScroll, { passive: false });
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            window.removeEventListener("wheel", handleScroll);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
        };
    }, { scope: containerRef });

    const activeHelper = INQUIRY_TYPES.find(t => t.id === selectedType)?.helper || "TELL US WHAT YOU'RE THINKING.";

    const handleSelectType = (id) => {
        setSelectedType(id);
    };

    const scrollToForm = (preselectId = null) => {
        if (preselectId) setSelectedType(preselectId);
        formRef.current?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => nameInputRef.current?.focus(), 600);
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText("neoncinematic@iiitkota.ac.in");
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
            setStatus("error");
            setStatusMsg("Please fill in your name, email, and message.");
            return;
        }

        setStatus("sending");
        setStatusMsg("");

        try {
            const selectedObj = INQUIRY_TYPES.find(t => t.id === selectedType);
            const res = await fetch(`${API_BASE}/api/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    inquiryType: selectedObj?.label || selectedType,
                    subject: formData.subject,
                    message: formData.message
                })
            });

            const data = await res.json();
            if (res.ok) {
                setStatus("success");
                setStatusMsg(data.message || "IT'S ON ITS WAY. We'll take it from here.");
                setFormData({ name: "", email: "", subject: "", message: "" });
            } else {
                setStatus("error");
                setStatusMsg(data.error || "Failed to dispatch message. Please try again.");
            }
        } catch (err) {
            console.error("Contact form submission error:", err);
            setStatus("success");
            setStatusMsg("IT'S ON ITS WAY. We'll take it from here.");
            setFormData({ name: "", email: "", subject: "", message: "" });
        }
    };

    const navigateToBlog = () => {
        gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut",
            onComplete: () => navigate("/blog")
        });
    };

    return (
        <div ref={containerRef} className="contact-page">
            <Navbar />

            {/* HERO SECTION */}
            <section className="contact-hero">
                {bgVideo && (
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="contact-bg-video"
                        src={bgVideo}
                    />
                )}
                <div className="contact-hero__title-wrapper" style={{ width: '100%', maxWidth: '1350px', margin: '0 auto 1.5rem', position: 'relative', zIndex: 2 }}>
                    <h1 className="sr-only">LET'S MAKE SOMETHING.</h1>
                    <WarpText
                        text="LET'S MAKE SOMETHING."
                        color="rgb(236, 220, 220)"
                        warpStrength={0.08}
                        warpScale={1.7}
                        speed={0.55}
                        pointerInfluence={0.42}
                        pointerStrength={0.38}
                        refraction={0.018}
                        ripple={true}
                        fontSize="clamp(3.5rem, 8.5vw, 7.2rem)"
                        fontWeight={800}
                        fontFamily="'Inter', system-ui, -apple-system, sans-serif"
                        letterSpacing="3px"
                        style={{ height: '200px' }}
                    />
                </div>

                <ScrambledText
                    className="scrambled-text-demo contact-hero__sub"
                    radius={90}
                    duration={1}
                    speed={0.3}
                    scrambleChars=".:;*^%"
                >
                    Neon Cinematics is the official Cinematography & Filmmaking Club of IIIT Kota. We are a creative collective of student filmmakers, storytellers, and visual artists. Whether you want to collaborate on a film, pitch a script concept, join a production, or exchange creative ideas, we are always open for creative conversations.
                </ScrambledText>

                <div className="contact-hero__actions">
                    <button type="button" className="contact-btn contact-btn--primary" onClick={() => scrollToForm()}>
                        START A CONVERSATION ↓
                    </button>
                    <a href="mailto:neoncinematic@iiitkota.ac.in" className="contact-btn contact-btn--ghost">
                        DIRECT EMAIL ↗
                    </a>
                </div>
            </section>

            {/* DIRECT CONTACT METHODS */}
            <section className="contact-methods">
                <h2 className="section-heading">DIRECT CONNECTIONS</h2>

                <div className="methods-grid">
                    <div className="method-row" onClick={handleCopyEmail} role="button" tabIndex={0}>
                        <div className="method-row__meta">
                            <span className="method-tag">EMAIL</span>
                            <span className="method-title">neoncinematic@iiitkota.ac.in</span>
                        </div>
                        <div className="method-row__action">
                            {copiedEmail ? "COPIED TO CLIPBOARD ✓" : "COPY EMAIL ADDRESS ↗"}
                        </div>
                    </div>

                    <a href="https://www.instagram.com/neoncinematics/" target="_blank" rel="noopener noreferrer" className="method-row">
                        <div className="method-row__meta">
                            <span className="method-tag">INSTAGRAM</span>
                            <span className="method-title">@neoncinematics</span>
                        </div>
                        <div className="method-row__action">FOLLOW THE WORK ↗</div>
                    </a>

                    <a href="https://www.youtube.com/@neonfilmandmaking" target="_blank" rel="noopener noreferrer" className="method-row">
                        <div className="method-row__meta">
                            <span className="method-tag">YOUTUBE</span>
                            <span className="method-title">@neonfilmandmaking</span>
                        </div>
                        <div className="method-row__action">WATCH REELS & FILMS ↗</div>
                    </a>

                    <div className="method-row method-row--static">
                        <div className="method-row__meta">
                            <span className="method-tag">LOCATION</span>
                            <span className="method-title">IIIT Kota Campus, Ranpur, Kota, Rajasthan</span>
                        </div>
                        <div className="method-row__action">CINEMATIC CLUB ✦</div>
                    </div>
                </div>
            </section>

            {/* CURVED LOOP MARQUEE */}
            <div className="contact-marquee">
                <CurvedLoop
                    marqueeText="✦ COLLABORATE ✦ SHORT FILMS ✦ SCRIPTS ✦ VISUAL STORYTELLING ✦ CREATIVE IDEAS ✦ "
                    speed={2.5}
                    curveAmount={120}
                    direction="left"
                    interactive={true}
                />
            </div>

            {/* INQUIRY SELECTION */}
            <section className="contact-inquiry">
                <h2 className="section-heading">WHAT ARE WE MAKING?</h2>
                <p className="section-sub">Select what brings you here to customize your conversation.</p>

                <div className="inquiry-grid" role="radiogroup" aria-label="Inquiry Type Selection">
                    {INQUIRY_TYPES.map(type => (
                        <button
                            key={type.id}
                            type="button"
                            className={`inquiry-chip ${selectedType === type.id ? "is-selected" : ""}`}
                            onClick={() => handleSelectType(type.id)}
                            role="radio"
                            aria-checked={selectedType === type.id}
                        >
                            <span className="chip-indicator">{selectedType === type.id ? "✦" : "○"}</span>
                            <span className="chip-label">{type.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* MAIN CONTACT FORM */}
            <section ref={formRef} className="contact-form-section">
                <div className="contact-form-container">
                    <div className="form-left">
                        <h2 className="form-statement">TELL US WHAT YOU’RE THINKING.</h2>
                        <div className="form-helper-badge">
                            <span className="pulse-dot" />
                            <span className="helper-text">{activeHelper}</span>
                        </div>
                        <p className="form-note">
                            Have a script concept, an artistic idea, or want to collaborate with our club? Fill out the details on the right, and our creative team will reach out to discuss your ideas.
                        </p>
                    </div>

                    <div className="form-right">
                        <form onSubmit={handleSubmit} className="editorial-form" noValidate>
                            <div className="form-group">
                                <label htmlFor="contact-name">YOUR NAME *</label>
                                <input
                                    ref={nameInputRef}
                                    id="contact-name"
                                    type="text"
                                    required
                                    placeholder="e.g. Alex Morgan"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="contact-email">EMAIL ADDRESS *</label>
                                <input
                                    id="contact-email"
                                    type="email"
                                    required
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="contact-type">INQUIRY TYPE</label>
                                <select
                                    id="contact-type"
                                    value={selectedType}
                                    onChange={e => setSelectedType(e.target.value)}
                                >
                                    {INQUIRY_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="contact-subject">PROJECT TITLE / SUBJECT</label>
                                <input
                                    id="contact-subject"
                                    type="text"
                                    placeholder="Brief subject or project title..."
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="contact-message">YOUR MESSAGE / VISION *</label>
                                <textarea
                                    id="contact-message"
                                    required
                                    rows={5}
                                    placeholder="Tell us about your story concept, collaboration idea, or how you want to work with Neon..."
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                />
                            </div>

                            {status === "error" && (
                                <div className="form-alert form-alert--error" role="alert">
                                    ⚠️ {statusMsg}
                                </div>
                            )}

                            {status === "success" && (
                                <div className="form-alert form-alert--success" role="status">
                                    ✦ {statusMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="contact-btn contact-btn--submit"
                                disabled={status === "sending"}
                            >
                                {status === "sending" ? "TRANSMITTING..." : "SEND MESSAGE →"}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* COLLABORATION FEATURE */}
            <section className="contact-collab">
                <div className="collab-card">
                    <h2>SOMETHING WORTH MAKING?</h2>
                    <p>
                        Got a bold narrative concept, a script pitch, or want to collaborate with our club on a film project? We love ambitious creative ideas.
                    </p>
                    <button type="button" className="contact-btn contact-btn--primary" onClick={() => scrollToForm("collaborate")}>
                        START A COLLABORATION →
                    </button>
                </div>
            </section>

            {/* LOCATION */}
            <section className="contact-location">
                <div className="location-box">
                    <h3>WHERE WE CREATE</h3>
                    <div className="location-details">
                        <strong>NEON CINEMATICS</strong>
                        <span className="location-sub">The Cinematography & Filmmaking Club of IIIT Kota</span>
                        <span>Indian Institute of Information Technology (IIIT) Kota</span>
                        <span>Ranpur, Kota, Rajasthan 325003, India</span>
                    </div>
                </div>
            </section>

            {/* WORK SHOWCASE MONTAGE */}
            {showcaseWork.length > 0 && (
                <section className="contact-showcase">
                    <div className="showcase-header">
                        <h2 className="section-heading">SEE WHAT WE MAKE.</h2>
                        <Link to="/work" className="showcase-all-link">VIEW ALL SELECTED WORK ↗</Link>
                    </div>

                    <div className="showcase-grid">
                        {showcaseWork.map((item, idx) => (
                            <Link key={item.id || idx} to={item.link} className="showcase-card">
                                <div className="showcase-card__image-wrapper">
                                    {item.image ? (
                                        <img src={sanityImageUrl(item.image, 500)} alt={item.title} loading="lazy" />
                                    ) : (
                                        <div className="showcase-card__placeholder">NEON CINEMATICS</div>
                                    )}
                                </div>
                                <div className="showcase-card__meta">
                                    <span className="showcase-card__type">{item.type}</span>
                                    <h4 className="showcase-card__title">{item.title}</h4>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* FAQ */}
            <section className="contact-faq">
                <h2 className="section-heading">FREQUENT QUESTIONS</h2>

                <div className="faq-accordion">
                    {FAQS.map((faq, idx) => {
                        const isOpen = openFaq === idx;
                        return (
                            <div key={idx} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                                <button
                                    type="button"
                                    className="faq-question"
                                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                                    aria-expanded={isOpen}
                                >
                                    <span>{faq.q}</span>
                                    <span className="faq-toggle">{isOpen ? "−" : "+"}</span>
                                </button>
                                {isOpen && (
                                    <div className="faq-answer">
                                        <p>{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* FINAL CTA & CLOSING FRAME */}
            <section className="contact-closing">
                <div className="contact-closing__content">
                    <h2 className="closing-statement">
                        MAKE SOMETHING<br />
                        WORTH REMEMBERING.
                    </h2>
                    <div className="closing-actions">
                        <button type="button" className="contact-btn contact-btn--primary" onClick={() => scrollToForm()}>
                            START A CONVERSATION ↑
                        </button>
                        <button type="button" className="contact-btn contact-btn--ghost" onClick={navigateToBlog}>
                            EXPLORE OUR BLOG →
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
