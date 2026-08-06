import { useEffect, useRef, useState } from 'react';
import styles from './MechanismOfAction.module.css';

const scenes = [
  {
    id: 'brain',
    label: 'Phase 01',
    highlight: 'Neural Circuitry',
    title: 'Appetite Control',
    description:
      'GLP-1 acts on your brain to mute "food noise" - that constant urge to eat. It signals fullness to your hypothalamus, helping you feel satisfied with smaller portions and reducing cravings naturally.',
    icon: '🧠',
  },
  {
    id: 'stomach',
    label: 'Phase 02',
    highlight: 'Gastric Motility',
    title: 'Digestive Harmony',
    description:
      'By slowing gastric emptying, GLP-1 keeps food in your stomach longer, creating sustained fullness and satisfaction. This gradual digestion prevents blood sugar spikes and keeps energy stable throughout the day.',
    icon: '🍃',
  },
  {
    id: 'pancreas',
    label: 'Phase 03',
    highlight: 'Metabolic Balance',
    title: 'Blood Sugar Regulation',
    description:
      "GLP-1 stimulates your pancreas to release insulin only when blood sugar rises, preventing dangerous spikes. This glucose-dependent mechanism works with your body's natural rhythm for safe, effective regulation.",
    icon: '⚡',
  },
];

function MechanismOfAction() {
  const mainContainerRef = useRef(null);
  const sceneRefs = useRef({});
  const [activeScene, setActiveScene] = useState(scenes[0].id);

  // Intersection Observer to track active cards during scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveScene(entry.target.id);
          }
        });
      },
      {
        root: null,
        threshold: 0.4,
      }
    );

    scenes.forEach((scene) => {
      const element = sceneRefs.current[scene.id];
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.outerWrapper} ref={mainContainerRef}>
      {/* Static Header Section - Matches clean white page theme */}
      <div className={styles.staticHeaderContainer}>
        <div className={styles.headerContentWrapper}>
          <span className={styles.subHeadingBadge}>Molecular Precision</span>
          <h2>How GLP-1 Therapy Works</h2>
          <p className={styles.headerSubtitle}>
            A scientific journey through your body's natural metabolic pathways.
          </p>
        </div>
      </div>

      {/* Modern Connected Tree / Timeline Flow Layout */}
      <div className={styles.timelineContainer}>
        <div className={styles.centralBranchLine} />

        <div className={styles.scenesWrapper}>
          {scenes.map((scene, index) => {
            const isActive = activeScene === scene.id;
            const isEven = index % 2 === 0;

            return (
              <div
                key={scene.id}
                id={scene.id}
                ref={(el) => {
                  sceneRefs.current[scene.id] = el;
                }}
                className={`${styles.timelineNode} ${
                  isEven ? styles.nodeLeft : styles.nodeRight
                } ${isActive ? styles.activeNode : ''}`}
              >
                {/* Glowing Node Marker on the Tree Line */}
                <div className={styles.nodeMarker}>
                  <span className={styles.markerIcon}>{scene.icon}</span>
                  <div className={styles.markerPulse} />
                </div>

                {/* Content Card */}
                <div className={styles.glassCard}>
                  <div className={styles.cardHeaderMeta}>
                    <span className={styles.sceneLabel}>{scene.label}</span>
                    <span className={styles.sceneHighlight}>{scene.highlight}</span>
                  </div>
                  <h3 className={styles.sceneTitle}>{scene.title}</h3>
                  <p className={styles.sceneDesc}>{scene.description}</p>
                  
                  <div className={styles.cardFooterIndicator}>
                    <span className={styles.indicatorDot} />
                    <span>Clinical Mechanism Verified</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MechanismOfAction;