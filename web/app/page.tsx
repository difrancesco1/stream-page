import { Suspense } from "react";
import CardContainer from "./components/card-container";

export default function Home() {
  return <div className="w-full h-screen bg-background p-[0.325rem] lg:p-[1.825rem] md:p-[1rem]">
    <Suspense>
      <CardContainer />
    </Suspense>
  </div>;
}
