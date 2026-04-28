window.__tmBuildingsConfig = {
    templates: {
        chalet_house: {
            base: {
                floors: 2,
                floorHeight: 2.85,
                color: 0xd7c2a2,
                inset: 0.08
            },
            roof: {
                enabled: true,
                type: "gable",
                color: 0x7f3128,
                height: 2.8,
                overhang: 0.55,
                ridgeDirection: "longest"
            },
            windows: {
                enabled: true,
                width: 0.9,
                height: 1.15,
                rows: 2,
                gap: 0.8,
                sill: 1.1,
                frameColor: 0xf6efe4,
                glassColor: 0x8bc7df
            },
            parts: [{
                type: "box",
                size: [5.5, 0.35, 1.1],
                position: [0, 3.25, -4.4],
                color: 0x6d3f24
            }, {
                type: "box",
                size: [1.2, 2.3, 1.2],
                position: [3.2, 6.4, 1.9],
                color: 0x6f5845
            }]
        },
        modern_villa: {
            base: {
                floors: 2,
                floorHeight: 3.1,
                color: 0xe9ece8,
                inset: 0.02
            },
            roof: {
                enabled: true,
                type: "flat",
                color: 0x535a60
            },
            windows: {
                enabled: true,
                width: 1.5,
                height: 1.55,
                rows: 2,
                gap: 0.35,
                margin: 0.55,
                frameColor: 0x20252a,
                glassColor: 0x91bed2
            },
            parts: [{
                type: "box",
                size: [3.6, 0.3, 2.8],
                position: [-2.5, 6.55, 0],
                color: 0x8e969d
            }, {
                type: "panel",
                size: [4.5, 2.4, 0.08],
                position: [2.8, 2.5, -4.15],
                color: 0x2a2f34
            }]
        },
        corner_shop: {
            base: {
                floors: 3,
                floorHeight: 3,
                color: 0xcfc1aa,
                inset: 0
            },
            roof: {
                enabled: true,
                type: "flat",
                color: 0x69645d
            },
            windows: {
                enabled: true,
                width: 1.05,
                height: 1.25,
                rows: 2,
                gap: 0.55,
                frameColor: 0xf4eee6,
                glassColor: 0xa5d7ff
            },
            parts: [{
                type: "panel",
                size: [5.5, 0.9, 0.08],
                position: [0, 3.0, -4.05],
                color: 0x1f4fbf
            }, {
                type: "box",
                size: [1.15, 2.2, 0.12],
                position: [0, 1.35, -4.12],
                color: 0x25405a
            }]
        },
        farm_barn: {
            base: {
                floors: 1,
                floorHeight: 4.2,
                color: 0x9b4b35,
                inset: 0
            },
            roof: {
                enabled: true,
                type: "gable",
                color: 0x4e565d,
                height: 3.2,
                overhang: 0.45,
                ridgeDirection: "longest"
            },
            windows: {
                enabled: false
            },
            parts: [{
                type: "box",
                size: [3.2, 3.3, 0.12],
                position: [0, 1.75, -4.55],
                color: 0x5c2f22
            }, {
                type: "cylinder",
                radius: 0.55,
                height: 5.6,
                segments: 16,
                position: [4.3, 2.8, 2.4],
                color: 0xb8b0a4
            }]
        },
        tower_house: {
            base: {
                floors: 2,
                floorHeight: 2.9,
                color: 0xd8d1c5,
                inset: 0.04
            },
            roof: {
                enabled: true,
                type: "gable",
                color: 0x744036,
                height: 2.2,
                overhang: 0.35
            },
            windows: {
                enabled: true,
                width: 0.85,
                height: 1.1,
                rows: 2,
                gap: 0.7
            },
            parts: [{
                type: "cylinder",
                radius: 1.7,
                height: 8.5,
                segments: 18,
                position: [3.9, 4.25, 2.8],
                color: 0xc9c0b1
            }, {
                type: "cylinder",
                radiusTop: 0.25,
                radiusBottom: 2.0,
                height: 2.1,
                segments: 18,
                position: [3.9, 9.55, 2.8],
                color: 0x744036
            }]
        }
    },
    buildings: [{
        id: "example_chalet_replace_me",
        template: "chalet_house",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_modern_villa_replace_me",
        template: "modern_villa",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_corner_shop_replace_me",
        template: "corner_shop",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_farm_barn_replace_me",
        template: "farm_barn",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_tower_house_replace_me",
        template: "tower_house",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }]
};
