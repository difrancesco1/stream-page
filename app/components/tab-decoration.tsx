export default function TabDecoration() {
    return (
        <div className="absolute top-0 left-0 w-full pointer-events-none z-[10] bg-white rounded-t-sm">
            {/* Decorative pixel border element */}
            <div className="h-0.5 bg-border border-b-0 rounded-t-sm mx-1" />
        </div>
    );
}
