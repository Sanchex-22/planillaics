// app/login/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {

  return (
    <div className="grid min-h-screen w-full place-items-center border-t-4 border-sky-400 bg-blue-800">
      <SignIn/>
    </div>
  )
}