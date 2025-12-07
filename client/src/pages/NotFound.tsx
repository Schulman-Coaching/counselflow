import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-xl text-gray-600">Page not found</p>
        <Link href="/">
          <a className="mt-6 inline-block rounded bg-primary px-4 py-2 text-white hover:bg-primary/90">
            Go Home
          </a>
        </Link>
      </div>
    </div>
  );
}
