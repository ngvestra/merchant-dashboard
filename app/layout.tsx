import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'Vestra Merchant', description:'Investment infrastructure operations' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html> }
