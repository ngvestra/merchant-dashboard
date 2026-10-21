import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Vestra Merchant',
  description: 'Investment infrastructure operations',
  icons: {
    icon: 'https://res.cloudinary.com/dv5awigtg/image/upload/e_trim,c_fill,g_center,w_128,h_128/v1792499633/white_transparent_icon_1_n3jrdy.png',
  },
};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html> }
