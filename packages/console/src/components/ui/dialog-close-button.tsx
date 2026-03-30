interface DialogCloseButtonProps {
  onClick: () => void;
  variant?: "floating" | "inline";
  className?: string;
}

export function DialogCloseButton({
  onClick,
  variant = "floating",
  className = "",
}: DialogCloseButtonProps) {
  const baseStyles =
    "p-2 text-white rounded-full backdrop-blur-md transition-all duration-200 border hover:scale-110 active:scale-95 group";

  const variantStyles = {
    floating: "bg-black/50 hover:bg-stone-800 border-white/10",
    inline:
      "bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800 border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      aria-label="Close dialog"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}
