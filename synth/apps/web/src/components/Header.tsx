"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from "./ConnectButton";
import { AnimatedNavLink } from "./AnimatedNavLink";
import styles from "./Header.module.css";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const navLinks = [
    { href: "/drops", title: "Drops", color: "var(--accent-primary)" },
    { href: "/suggest", title: "Suggest", color: "var(--accent-secondary)" },
    {
      href: "https://twitter.com/synthclaw",
      title: "Twitter",
      color: "var(--accent-tertiary)",
      external: true,
    },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <a href="/" className={styles.logo}>
          <img
            src="/images/logo.png"
            alt="SYNTHCLAW"
            className={styles.logoImage}
          />
          <span className={styles.logoText}>SYNTHCLAW</span>
        </a>
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <AnimatedNavLink
              key={link.title}
              href={link.href}
              title={link.title}
              hoverColor={link.color}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
            />
          ))}
        </nav>
        <div className={styles.actions}>
          <div className={styles.desktopActions}>
            <ConnectButton />
          </div>
          <button
            className={styles.menuButton}
            onClick={toggleMenu}
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={styles.mobileMenu}
          >
            <nav className={styles.mobileNav}>
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => setIsOpen(false)}
                >
                  <AnimatedNavLink
                    href={link.href}
                    title={link.title}
                    hoverColor={link.color}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noreferrer" : undefined}
                    large={true}
                  />
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + navLinks.length * 0.05 }}
                className={styles.mobileActions}
              >
                <ConnectButton />
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
