import { BottomNav } from "../components/bottom-nav"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="pb-14">{children}</div>
      <BottomNav />
    </>
  )
}
