import Link from "next/link";

export function PageFooter() {
  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-6 py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          &copy; {new Date().getFullYear()} Worlds Console. All rights reserved.
        </p>
        <div className="flex items-center space-x-6">
          <Link
            href="https://wazoo.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
          >
            Company
          </Link>

          <Link
            href="https://docs.wazoo.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
          >
            Documentation
          </Link>
        </div>
      </div>
    </footer>
  );
}
