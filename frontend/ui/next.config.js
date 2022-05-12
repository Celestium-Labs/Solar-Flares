const DFXWebPackConfig = require("./dfx.webpack.config")
DFXWebPackConfig.initCanisterIds()

const webpack = require("webpack")

// Make DFX_NETWORK available to Web Browser with default "local" if DFX_NETWORK is undefined
const EnvPlugin = new webpack.EnvironmentPlugin({
    DFX_NETWORK: "local",
})

/** @type {import('next').NextConfig} */
module.exports = {
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        // Plugin
        config.plugins.push(EnvPlugin)

        // Important: return the modified config
        return config
    },
    reactStrictMode: true,
    trailingSlash: true,
    exportPathMap: async function (
        defaultPathMap,
        { dev, dir, outDir, distDir, buildId }
      ) {
        return {
          '/': { page: '/' },
          '/room': { page: '/room' },
          '/rooms': { page: '/rooms' },
        }
      },
}