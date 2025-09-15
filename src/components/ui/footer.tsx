import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center text-sm text-muted-foreground">
          <div className="space-y-1">
            <div>
              <Link 
                href="https://www.cursor.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Cursor
              </Link>
              {' '}对本站亦有贡献 / 致敬{' '}
              <Link 
                href="https://mdig.cc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                mdig.cc
              </Link>
            </div>
            <div>
              本站开源于{' '}
              <Link 
                href="https://github.com/JimmyKmi/open-dig" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                GitHub
              </Link>
              {' '}by JimmyKmi / v25.09.16
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
