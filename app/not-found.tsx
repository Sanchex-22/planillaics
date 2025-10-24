import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen w-full place-content-center bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <h1 className="select-none text-3xl text-black dark:text-white">
        404 - Page not found
      </h1>
      <Link
        href="/:id/dashboard"
        className="text-center font-bold text-blue-900 underline dark:text-blue-200"
      >
        <span className="animate-duration-600 animate-pulse no-underline">
          &larr;
        </span>{" "}
        &nbsp; Back to Dashboard
      </Link>
    </div>
  );
}
