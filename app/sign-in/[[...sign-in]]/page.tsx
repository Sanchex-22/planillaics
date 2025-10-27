// app/login/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {

  return (
    <div className="grid min-h-screen w-full place-items-center border-t-4 black bg-white">
      <SignIn
        path="/sign-in"
        routing="path"
        fallbackRedirectUrl={`/id:/dashboard`}
      />
    </div>
  )
}