import Image from "next/image";

interface ShopContainerProps {
  children?: React.ReactNode;
}

export default function ShopContainer({ children }: ShopContainerProps) {
  return (
    <div className="w-full h-full bg-card p-[0.125rem] rounded-lg shadow-md relative flex items-center justify-center py-2">
      <Image
        src="/background.gif"
        alt="Background image"
        fill
        className="object-cover pixel-borders"
        quality={0}
        priority
      />
      {children}
    </div>
  );
}
