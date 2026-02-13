import { motion } from "framer-motion";

const NotFound = () => {
  const orange = "hsl(18, 74%, 54%)";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Soft radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 600px 400px at 50% 45%, hsla(18, 74%, 54%, 0.06), transparent)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6">
        {/* SVG Illustration — broken document */}
        <motion.svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Shadow */}
          <ellipse cx="100" cy="175" rx="50" ry="6" fill="hsl(var(--foreground))" opacity="0.05" />

          {/* Back page */}
          <rect x="55" y="22" width="90" height="120" rx="6" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />

          {/* Front page */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: -6 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            style={{ transformOrigin: "100px 80px" }}
          >
            <rect x="45" y="30" width="90" height="120" rx="6" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5" />
            {/* Lines on page */}
            <rect x="60" y="50" width="50" height="4" rx="2" fill={orange} opacity="0.6" />
            <rect x="60" y="62" width="60" height="3" rx="1.5" fill="hsl(var(--foreground))" opacity="0.08" />
            <rect x="60" y="72" width="45" height="3" rx="1.5" fill="hsl(var(--foreground))" opacity="0.08" />
            <rect x="60" y="82" width="55" height="3" rx="1.5" fill="hsl(var(--foreground))" opacity="0.08" />
            <rect x="60" y="92" width="35" height="3" rx="1.5" fill="hsl(var(--foreground))" opacity="0.08" />
          </motion.g>

          {/* Orange circle with X */}
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5, ease: "backOut" }}
          >
            <circle cx="140" cy="45" r="22" fill={orange} />
            <line x1="131" y1="36" x2="149" y2="54" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <line x1="149" y1="36" x2="131" y2="54" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </motion.g>
        </motion.svg>

        {/* 404 Text */}
        <motion.h1
          className="mt-6 text-7xl font-bold tracking-tighter sm:text-8xl"
          style={{ color: orange }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 0.15, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          404
        </motion.h1>

        {/* Label */}
        <motion.p
          className="ml-6 mt-2 text-lg font-semibold tracking-tight text-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          Page not found
        </motion.p>
      </div>
    </div>
  );
};

export default NotFound;