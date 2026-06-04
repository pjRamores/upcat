function TestModeTicker({ onTick, }: { onTick: () => void; }) {
    useEffect(() => {
        const id = window.setInterval(() => {
            onTick();
        }, 1000);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
}