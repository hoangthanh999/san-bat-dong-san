module.exports = ({ config }) => ({
    ...config,
    scheme: "homeswipe",
    android: {
        ...config.android,
        googleServicesFile: "./android/app/google-services.json",
    },
    plugins: [
        ...(config.plugins || []),
        [
            "expo-notifications",
            {
                icon: "./assets/adaptive-icon.png",
                color: "#0066FF",
                androidMode: "default",
            }
        ]
    ],
});
