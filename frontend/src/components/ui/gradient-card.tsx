import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "relative flex flex-col justify-between h-full w-full overflow-hidden rounded-2xl p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg cursor-pointer",
  {
    variants: {
      gradient: {
        orange: "bg-gradient-to-br from-orange-50 to-amber-100/70",
        blue:   "bg-gradient-to-br from-blue-50 to-sky-100/70",
        purple: "bg-gradient-to-br from-purple-50 to-indigo-100/70",
        gray:   "bg-gradient-to-br from-slate-50 to-slate-200/50",
        green:  "bg-gradient-to-br from-emerald-50 to-teal-100/70",
        teal:   "bg-gradient-to-br from-teal-50 to-cyan-100/70",
      },
    },
    defaultVariants: { gradient: "gray" },
  }
);

export interface GradientCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  badgeText: string;
  badgeColor: string;
  title: string;
  description: string;
  ctaText?: string;
  onClick?: () => void;
  Logo: React.FC<React.SVGProps<SVGSVGElement>>;
}

const cardAnim   = { rest: { scale: 1, y: 0 },       hover: { scale: 1.03, y: -4 } };
const logoAnim   = { rest: { scale: 1, rotate: 0 },   hover: { scale: 1.1, rotate: 3 } };

export function GradientCard({
  className,
  gradient,
  badgeText,
  badgeColor,
  title,
  description,
  ctaText = "Cliquez pour voir plus en détail",
  onClick,
  Logo,
  ...props
}: GradientCardProps) {
  return (
    <motion.div
      variants={cardAnim}
      initial="rest"
      whileHover="hover"
      animate="rest"
      className="h-full"
      onClick={onClick}
    >
      <div className={cn(cardVariants({ gradient }), className)} {...props}>
        {/* Decorative logo — bottom-right, large, semi-transparent */}
        <motion.div
          variants={logoAnim}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="absolute -right-6 -bottom-6 w-36 h-36 opacity-[0.12] pointer-events-none"
        >
          <Logo className="w-full h-full" />
        </motion.div>

        {/* Content */}
        <div className="z-10 flex flex-col h-full">
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur-sm w-fit border border-white/80">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: badgeColor }} />
            {badgeText}
          </div>

          {/* Title & description */}
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{description}</p>
          </div>

          {/* CTA */}
          <button className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-800 self-start">
            {ctaText}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
