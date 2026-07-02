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
                color: "#f96302",
                androidMode: "default",
            }
        ],
        "expo-secure-store"
    ],
});
