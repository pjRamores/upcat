export default function MaintenancePage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-8 bg-white rounded shadow text-center animate-fade-in">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Maintenance in Progress</h1>
                <p className="text-gray-700 mb-6">
                    Our servers are currently undergoing scheduled maintenance.<br/>
                    Please check back soon. Thank you for your patience!
                </p>
                <div className="text-gray-400 text-xs">&copy; {new Date().getFullYear()} UPCAT Simulator</div>
            </div>
        </div>
    );
}