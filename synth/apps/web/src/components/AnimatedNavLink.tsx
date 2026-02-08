"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import styles from "./AnimatedNavLink.module.css";

const titleAnimation = {
  rest: {
    transition: {
      staggerChildren: 0.005,
    },
  },
  hover: {
    transition: {
      staggerChildren: 0.005,
    },
  },
};

interface AnimatedNavLinkProps {
  href: string;
  title: string;
  target?: string;
  rel?: string;
  hoverColor?: string;
  large?: boolean;
}

export const AnimatedNavLink = ({
  href,
  title,
  target,
  rel,
  hoverColor,
  large,
}: AnimatedNavLinkProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const yOffset = large ? -40 : -25;

  const letterAnimation = {
    rest: { y: 0 },
    hover: {
      y: yOffset,
      transition: {
        duration: 0.3,
        ease: [0.6, 0.01, 0.05, 0.95],
        type: "tween",
      },
    },
  };

  const letterAnimationTwo = {
    rest: { y: -yOffset },
    hover: {
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.6, 0.01, 0.05, 0.95],
        type: "tween",
      },
    },
  };

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={`${styles.navLink} ${large ? styles.large : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.container}>
        <AnimatedWord
          title={title}
          animations={letterAnimation}
          isHovered={isHovered}
          hoverColor={hoverColor}
        />
        <div className={styles.absoluteContainer}>
          <AnimatedWord
            title={title}
            animations={letterAnimationTwo}
            isHovered={isHovered}
            hoverColor={hoverColor}
          />
        </div>
      </div>
    </a>
  );
};

const AnimatedWord = ({
  title,
  animations,
  isHovered,
  hoverColor,
}: {
  title: string;
  animations: any;
  isHovered: boolean;
  hoverColor?: string;
}) => (
  <motion.span
    className={styles.word}
    variants={titleAnimation}
    initial="rest"
    animate={isHovered ? "hover" : "rest"}
  >
    {title.split("").map((char, i) =>
      char === " " ? (
        <span key={i}>&nbsp;</span>
      ) : (
        <motion.span
          variants={animations}
          key={i}
          className={styles.letter}
          style={
            isHovered && hoverColor
              ? ({ "--hover-color": hoverColor } as any)
              : {}
          }
        >
          {char}
        </motion.span>
      ),
    )}
  </motion.span>
);
