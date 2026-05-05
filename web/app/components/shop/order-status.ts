export function statusBadgeClass(status: string): string {
    switch (status) {
        case "paid":
            return "bg-emerald-500/20 text-emerald-700";
        case "shipped":
            return "bg-blue-500/20 text-blue-700";
        case "delivered":
            return "bg-emerald-700/20 text-emerald-800";
        case "pending":
            return "bg-amber-500/20 text-amber-700";
        case "failed":
            return "bg-red-500/20 text-red-700";
        case "refunded":
            return "bg-zinc-400/20 text-zinc-700";
        default:
            return "bg-zinc-300 text-zinc-800";
    }
}
