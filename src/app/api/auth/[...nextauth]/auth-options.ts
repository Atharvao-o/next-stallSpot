import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

declare module 'next-auth' {
 interface Session {
   user: {
     id?: string;
     name?: string | null;
     email?: string | null;
     image?: string | null;
     role?: 'organizer' | 'vendor' | null;
     profileComplete?: boolean;
   };
 }

 interface User {
   id?: string;
   name?: string;
   email?: string;
   role?: 'organizer' | 'vendor';
   profileComplete?: boolean;
 }
}

export const authOptions: AuthOptions = {
 providers: [
   CredentialsProvider({
     name: 'Credentials',
     credentials: {
       email: { label: "email", type: "email" },
       password: { label: "password", type: "password" }
     },
     async authorize(credentials) {
       try {
         if (!credentials?.email || !credentials.password) return null;
         
         await dbConnect();
         const dbUser = await User.findOne({ email: credentials.email }).lean();
         if (!dbUser) return null;
         
         const isValid = await bcrypt.compare(credentials.password, dbUser.password);
         if (!isValid) return null;
         
         return {
           id: dbUser._id.toString(),
           name: dbUser.name,
           email: dbUser.email,
           role: dbUser.role,
           profileComplete: dbUser.profileComplete,
           image: dbUser.profilePicture || null
         };
       } catch (error) {
         console.error('Authorization Error:', error);
         return null;
       }
     }
   })
 ],
 callbacks: {
   async jwt({ token, user }) {
     if (user) {
       token.id = user.id;
       token.role = user.role;
       token.profileComplete = user.profileComplete;
     }
     return token;
   },
   async session({ session, token }) {
     if (session?.user) {
       session.user.id = token.id;
       session.user.role = token.role;
       session.user.profileComplete = token.profileComplete;
     }
     return session;
   }
 },
 pages: {
   signIn: '/auth/login',
 },
 session: {
   strategy: 'jwt',
   maxAge: 30 * 24 * 60 * 60, // 30 days
 },
 debug: process.env.NODE_ENV === 'development'
};

