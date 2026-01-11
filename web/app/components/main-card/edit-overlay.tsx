"use client";

import EditIcon from "@mui/icons-material/Edit";

export default function EditOverlay() {
  return (
    <div className="flex justify-center items-center bg-black/20 w-full h-full z-10 opacity-0 hover:opacity-100 rounded-lg">
      <EditIcon className="text-white" fontSize="large" />
    </div>
  );
}
