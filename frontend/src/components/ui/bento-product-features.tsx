import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 10 },
  },
};

interface BentoGridShowcaseProps {
  integration: React.ReactNode;
  trackers: React.ReactNode;
  statistic: React.ReactNode;
  focus: React.ReactNode;
  productivity: React.ReactNode;
  shortcuts: React.ReactNode;
  className?: string;
}

export const BentoGridShowcase = ({
  integration,
  trackers,
  statistic,
  focus,
  productivity,
  shortcuts,
  className,
}: BentoGridShowcaseProps) => {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className={cn(
        "grid w-full grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-3 md:auto-rows-fr",
        className
      )}
    >
      {/* Slot 1 — tall left (3 rows) */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-3 h-full">
        {integration}
      </motion.div>

      {/* Slot 2 — top middle */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1 h-full">
        {trackers}
      </motion.div>

      {/* Slot 3 — top right */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1 h-full">
        {statistic}
      </motion.div>

      {/* Slot 4 — middle middle */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1 h-full">
        {focus}
      </motion.div>

      {/* Slot 5 — middle right */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1 h-full">
        {productivity}
      </motion.div>

      {/* Slot 6 — wide bottom (2 cols) */}
      <motion.div variants={itemVariants} className="md:col-span-2 md:row-span-1 h-full">
        {shortcuts}
      </motion.div>
    </motion.section>
  );
};
