import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import styles from './MechanismOfAction.module.css';

const scenes = [
  {
    id: 'brain',
    label: 'Brain',
    title: 'Appetite Control',
    description:
      'GLP-1 acts on your brain to mute "food noise" - that constant urge to eat. It signals fullness to your hypothalamus, helping you feel satisfied with smaller portions and reducing cravings naturally.',
  },
  {
    id: 'stomach',
    label: 'Stomach',
    title: 'Digestive Harmony',
    description:
      'By slowing gastric emptying, GLP-1 keeps food in your stomach longer, creating sustained fullness and satisfaction. This gradual digestion prevents blood sugar spikes and keeps energy stable throughout the day.',
  },
  {
    id: 'pancreas',
    label: ' Pancreas',
    title: 'Blood Sugar Balance',
    description:
      "GLP-1 stimulates your pancreas to release insulin only when blood sugar rises, preventing dangerous spikes. This glucose-dependent mechanism works with your body's natural rhythm for safe, effective regulation.",
  },
];

function MechanismOfAction() {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const mainContainerRef = useRef(null);
  const sceneRefs = useRef({});
  const [activeScene, setActiveScene] = useState(null);
  const [isAnimationReady, setIsAnimationReady] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
  if (!containerRef.current) return;

  const anim = lottie.loadAnimation({
    container: containerRef.current,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: '/animations/mechanism.json',
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
      clearCanvas: true,
    },
  });

  anim.addEventListener('DOMLoaded', () => {
    setIsAnimationReady(true);
    anim.resize();
  });

  animRef.current = anim;

  const handleResize = () => {
    anim.resize();
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
    anim.destroy();
  };
}, []);

  useEffect(() => {
    if (!animRef.current || !isAnimationReady) return;

    let animationFrameId = null;
    let currentFrame = 0;
    let targetFrame = 0;

    const handleScroll = () => {
      if (!mainContainerRef.current || !animRef.current) return;

      const scrollContainer = mainContainerRef.current;
      const scrollHeight = scrollContainer.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const scrollProgress =
        scrollHeight > 0 ? Math.min(Math.max(scrolled / scrollHeight, 0), 1) : 0;

      const totalFrames = animRef.current.totalFrames || 120;
      const slowedProgress = scrollProgress * 0.9;
      targetFrame = Math.floor(slowedProgress * (totalFrames - 1));

      // Handle header visibility based on scroll direction
      if (scrolled > lastScrollYRef.current) {
        setHeaderVisible(false);
      } else {
        setHeaderVisible(true);
      }
      lastScrollYRef.current = scrolled;
    };

    const animate = () => {
      if (Math.abs(currentFrame - targetFrame) > 0.5) {
        currentFrame += (targetFrame - currentFrame) * 0.15;
        animRef.current.goToAndStop(Math.round(currentFrame), true);
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    const scrollAnimationFrame = () => {
      animate();
      animationFrameId = requestAnimationFrame(scrollAnimationFrame);
    };
    animationFrameId = requestAnimationFrame(scrollAnimationFrame);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isAnimationReady]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveScene(entry.target.id);
          }
        });
      },
      { threshold: 0.4 }
    );

    scenes.forEach((scene) => {
      const element = sceneRefs.current[scene.id];
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.container} ref={mainContainerRef}>
      <div className={styles.lottieBackgroundContainer} ref={containerRef} />
      <div className={styles.videoOverlayDimmer} />

      <div className={`${styles.introHeader} ${headerVisible ? '' : styles.hideIntroHeader}`}>
        <h2>Why GLP-1 Therapy Works</h2>
      </div>

      <div className={styles.contentOverlayTrack}>

        {scenes.map((scene) => (
          <div
            key={scene.id}
            id={scene.id}
            ref={(el) => {
              sceneRefs.current[scene.id] = el;
            }}
            className={`${styles.sceneBlock} ${
              activeScene === scene.id ? styles.activeScene : ''
            }`}
          >
            <div className={styles.glassCard}>
              <span className={styles.sceneLabel}>{scene.label}</span>
              <h3 className={styles.sceneTitle}>{scene.title}</h3>
              <p className={styles.sceneDesc}>{scene.description}</p>
            </div>
          </div>
        ))}

        <div style={{ height: '20vh' }} />
      </div>
    </div>
  );
}

export default MechanismOfAction;