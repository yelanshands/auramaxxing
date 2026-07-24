export default function handler(req, res) {
    if (req.method === 'GET') {}
    if (req.method === 'POST') {
        const { data } = req.body || {}

        return res.status(200).json({
            success: true,
            message: "Received request!",
            data: data,
            timestamp: new Date().toISOString()
        })
    }

    return res.status(405).json({error: "Method not implemented"})
}