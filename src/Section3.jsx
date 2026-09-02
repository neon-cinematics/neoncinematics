import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar/Navbar";
import { sanityClient, teamMembersQuery } from "./lib/sanity";
import { sanityImageUrl } from "./lib/sanityImage";
import WarpText from "./components/ReactBits/WarpText";
import FoldText from "./components/ReactBits/FoldText";
import CurvedLoop from "./components/ReactBits/CurvedLoop";
import ScrambledText from "./components/ReactBits/ScrambledText";
import TextPressure from "./components/ReactBits/TextPressure";
import "./Section3.css";

const Section3 = () => {
    const navigate = useNavigate();
    const container = useRef();
    const [members, setMembers] = useState({
        coordinators: [],
        thirdYear: [],
        secondYear: [],
        firstYear: []
    });

    useEffect(() => {
        const fetchTeam = async () => {
            if (!sanityClient) return;
            try {
                const data = await sanityClient.fetch(teamMembersQuery);
                const grouped = {
                    coordinators: data.filter(m => m.category === "Coordinators"),
                    thirdYear: data.filter(m => m.category === "3rd Year"),
                    secondYear: data.filter(m => m.category === "2nd Year"),
                    firstYear: data.filter(m => m.category === "1st Year")
                };
                setMembers(grouped);
            } catch (err) {
                console.error("Failed to fetch team members", err);
            }
        };
        fetchTeam();
    }, []);

    useGSAP(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);

        gsap.fromTo(container.current, 
            { opacity: 0 },
            {
                opacity: 1,
                duration: 1.5,
                ease: "power2.out"
            }
        );

        // Intro Text Animation
        gsap.fromTo(".about-intro h1", 
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                delay: 0.5,
                ease: "power3.out"
            }
        );
        
        gsap.fromTo(".about-intro p", 
            { y: 30, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                delay: 0.8,
                ease: "power3.out"
            }
        );

        let isSnapping = false;
        const goToWork = () => {
            if (isSnapping) return;
            isSnapping = true;
            gsap.to(container.current, {
                opacity: 0,
                duration: 0.5,
                ease: "power2.inOut",
                onComplete: () => navigate("/work", { state: { scrollToGallery: true } })
            });
        };

        const handleScroll = (e) => {
            if (isSnapping) return;
            if (e.deltaY < 0 && window.scrollY <= 4) {
                e.preventDefault();
                goToWork();
            }
        };

        let startY = 0;
        const handleTouchStart = (e) => { startY = e.touches[0].clientY; };
        const handleTouchMove = (e) => {
            if (isSnapping) return;
            const currentY = e.touches[0].clientY;
            const delta = currentY - startY;
            if (delta > 60 && window.scrollY <= 4) {
                e.preventDefault();
                goToWork();
            }
        };

        window.addEventListener("wheel", handleScroll, { passive: false });
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });

        const cardListeners = [];
        const cardWrappers = gsap.utils.toArray(".team-member-card-wrapper");
        
        // Make the info pop out in 3D
        gsap.set(".team-member-info", { transformStyle: "preserve-3d", transformOrigin: "center center", z: 30 });
        gsap.set(".team-member-card", { transformStyle: "preserve-3d", transformPerspective: 1000 });

        cardWrappers.forEach((wrapper, i) => {
            const card = wrapper.querySelector(".team-member-card");
            if (!card) return;

            // Card Scroll Parallax (Staggered offsets applied to the wrapper)
            const yOffset = i % 2 === 0 ? 30 : -30;
            gsap.fromTo(wrapper,
                { y: yOffset },
                {
                    y: -yOffset,
                    ease: "none",
                    scrollTrigger: {
                        trigger: wrapper,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 1
                    }
                }
            );

            // 3D Magnetic Hover Tilt (applied to the card itself based on mouse over the wrapper)
            const handleMouseMove = (e) => {
                const rect = wrapper.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = ((y - centerY) / centerY) * -15; // Max 15deg tilt
                const rotateY = ((x - centerX) / centerX) * 15;
                
                const moveX = ((x - centerX) / centerX) * 15; // Magnetic drag 15px
                const moveY = ((y - centerY) / centerY) * 15;
                
                gsap.to(card, {
                    x: moveX,
                    y: moveY,
                    rotateX,
                    rotateY,
                    duration: 0.5,
                    ease: "power2.out"
                });
                
                // Extra pop for the info on hover
                const info = card.querySelector(".team-member-info");
                if (info) gsap.to(info, { z: 50, duration: 0.5, ease: "power2.out" });
            };

            const handleMouseLeave = () => {
                gsap.to(card, {
                    x: 0,
                    y: 0,
                    rotateX: 0,
                    rotateY: 0,
                    duration: 0.5,
                    ease: "power2.out"
                });
                const info = card.querySelector(".team-member-info");
                if (info) gsap.to(info, { z: 30, duration: 0.5, ease: "power2.out" });
            };

            wrapper.addEventListener("mousemove", handleMouseMove);
            wrapper.addEventListener("mouseleave", handleMouseLeave);
            
            cardListeners.push({ wrapper, handleMouseMove, handleMouseLeave });
        });

        return () => {
            window.removeEventListener("wheel", handleScroll);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            cardListeners.forEach(({ wrapper, handleMouseMove, handleMouseLeave }) => {
                wrapper.removeEventListener("mousemove", handleMouseMove);
                wrapper.removeEventListener("mouseleave", handleMouseLeave);
            });
        };
    }, { scope: container, dependencies: [members] });

    const renderTeamGrid = (teamList, modifierClass) => {
        if (!teamList || teamList.length === 0) return null;
        
        // Define sizes based on hierarchy to optimize Sanity Image loading
        let size = 300;
        if (modifierClass.includes('coordinators')) size = 600;
        else if (modifierClass.includes('3rd')) size = 400;
        else if (modifierClass.includes('2nd')) size = 250;
        else size = 200; // 1st year

        return (
            <div className={`team-grid ${modifierClass}`}>
                {teamList.map(member => (
                    <div key={member._id} className="team-member-card-wrapper">
                        <div className="team-member-card">
                            <img 
                                src={sanityImageUrl(member.image, size)} 
                                alt={member.name} 
                                loading="lazy" 
                            />
                            <div className="team-member-info">
                                <h3>{member.name}</h3>
                                <div className="position-wrapper" style={{ height: '40px', width: '100%', position: 'relative' }}>
                                    <WarpText
                                        text={member.position}
                                        color="#ff7800"
                                        warpStrength={0.05}
                                        warpScale={1.5}
                                        fontSize="clamp(0.8rem, 2vw, 1.2rem)"
                                        fontWeight={500}
                                        style={{ height: '40px' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div ref={container} className="about-section">
            <Navbar />

            <section className="about-intro">
                <div className="about-title-wrapper" style={{ width: '100%', maxWidth: '800px', marginBottom: '1rem' }}>
                    <WarpText
                        text="About Us"
                        color="rgb(236, 220, 220)"
                        warpStrength={0.08}
                        warpScale={1.7}
                        speed={0.55}
                        pointerInfluence={0.42}
                        pointerStrength={0.38}
                        refraction={0.018}
                        ripple={true}
                        fontSize="clamp(4rem, 10vw, 7rem)"
                        fontWeight={800}
                        fontFamily="'Inter', system-ui, -apple-system, sans-serif"
                        letterSpacing="4px"
                        style={{ height: '120px' }}
                    />
                </div>
                <ScrambledText
                    className="scrambled-text-demo"
                    radius={90}
                    duration={1}
                    speed={0.3}
                    scrambleChars=".:;*^%"
                >
                    Neon Cinematics is the creative heartbeat of visual storytelling. We are a passionate collective 
                    of filmmakers, cinematographers, and visionaries dedicated to capturing the unseen and the unforgettable. 
                    From conceptualizing groundbreaking ideas to executing them with precision, we turn ordinary moments 
                    into cinematic masterpieces. Dive into our world, where every frame tells a story.
                </ScrambledText>
            </section>

            <div style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginTop: '2rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
                <CurvedLoop 
                    marqueeText="Make ✦ Something ✦ Worth ✦ Remembering ✦ "
                    speed={3}
                    curveAmount={160}
                    direction="right"
                    interactive={true}
                    className="custom-text-style"
                />

            </div>

            <div style={{ position: 'relative', height: '80px', width: '60%', margin: '12rem auto 4rem', padding: '0 5%' }}>
                <TextPressure
                    text="MEET OUR TEAM"
                    flex={true}
                    alpha={false}
                    stroke={false}
                    width={true}
                    weight={true}
                    italic={true}
                    textColor="#ffffff"
                    strokeColor="#ff7800"
                    minFontSize={24}
                />
            </div>

            <section className="team-hierarchy-section">
                <h2>
                    <FoldText text="The Visionaries" trigger="scroll" fontSize="2.5rem" color="rgb(236, 220, 220)" />
                </h2>
                {renderTeamGrid(members.coordinators, 'team-grid--coordinators')}
            </section>

            <section className="team-hierarchy-section">
                <h2>
                    <FoldText text="3rd Year Leads" trigger="scroll" fontSize="2.5rem" color="rgb(236, 220, 220)" />
                </h2>
                {renderTeamGrid(members.thirdYear, 'team-grid--3rd-year')}
            </section>

            <section className="team-hierarchy-section">
                <h2>
                    <FoldText text="2nd Year Core" trigger="scroll" fontSize="2.5rem" color="rgb(236, 220, 220)" />
                </h2>
                {renderTeamGrid(members.secondYear, 'team-grid--2nd-year show-on-hover')}
            </section>

            <section className="team-hierarchy-section">
                <h2>
                    <FoldText text="1st Year Talent" trigger="scroll" fontSize="2.5rem" color="rgb(236, 220, 220)" />
                </h2>
                {renderTeamGrid(members.firstYear, 'team-grid--1st-year show-on-hover')}
            </section>
        </div>
    );
};

export default Section3;