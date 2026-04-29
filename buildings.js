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
        },
        city_apartment: {
            base: {
                floors: 5,
                floorHeight: 2.85,
                color: 0xb8b2a8,
                inset: 0.01
            },
            roof: {
                enabled: true,
                type: "flat",
                color: 0x4e565d
            },
            windows: {
                enabled: true,
                width: 0.9,
                height: 1.05,
                rows: 5,
                gap: 0.45,
                margin: 0.55,
                frameColor: 0xeee7db,
                glassColor: 0x92bfd6
            },
            parts: [{
                type: "panel",
                size: [6.2, 1.0, 0.08],
                position: [0, 1.8, -4.1],
                color: 0x6f2f2f
            }, {
                type: "box",
                size: [1.2, 2.2, 0.16],
                position: [0, 1.25, -4.16],
                color: 0x2e3438
            }]
        },
        glass_office: {
            base: {
                floors: 6,
                floorHeight: 3.15,
                color: 0xd7dde2,
                inset: 0
            },
            roof: {
                enabled: true,
                type: "flat",
                color: 0x2b333b
            },
            windows: {
                enabled: true,
                width: 1.25,
                height: 1.95,
                rows: 6,
                gap: 0.12,
                margin: 0.35,
                frameColor: 0x1e2730,
                glassColor: 0x6ea8c5
            },
            parts: [{
                type: "box",
                size: [2.5, 1.4, 2.5],
                position: [2.9, 19.5, 2.2],
                color: 0x3b4650
            }, {
                type: "panel",
                size: [5.8, 3.0, 0.08],
                position: [0, 2.2, -4.1],
                color: 0x294456
            }]
        },
        petrol_station: {
            base: {
                floors: 1,
                floorHeight: 3.2,
                color: 0xe8e1d2,
                inset: 0
            },
            roof: {
                enabled: true,
                type: "flat",
                color: 0xcc262d
            },
            windows: {
                enabled: true,
                width: 1.4,
                height: 1.2,
                rows: 1,
                gap: 0.2,
                frameColor: 0xf4eee6,
                glassColor: 0x8ec4d8
            },
            parts: [{
                type: "box",
                size: [10, 0.35, 7],
                position: [0, 4.25, -1.2],
                color: 0xcc262d
            }, {
                type: "box",
                size: [0.5, 3.8, 0.5],
                position: [-3.8, 2.1, -3.2],
                color: 0xded8ce
            }, {
                type: "box",
                size: [0.5, 3.8, 0.5],
                position: [3.8, 2.1, -3.2],
                color: 0xded8ce
            }]
        },
        village_church: {
            base: {
                floors: 2,
                floorHeight: 3.6,
                color: 0xd9d0bd,
                inset: 0.02
            },
            roof: {
                enabled: true,
                type: "gable",
                color: 0x5c4035,
                height: 3.5,
                overhang: 0.35,
                ridgeDirection: "longest"
            },
            windows: {
                enabled: true,
                width: 0.65,
                height: 1.55,
                rows: 2,
                gap: 1.2,
                frameColor: 0xf4eee6,
                glassColor: 0x678bb2
            },
            parts: [{
                type: "box",
                size: [2.6, 10.0, 2.6],
                position: [-4.1, 5.0, 0],
                color: 0xc8bda8
            }, {
                type: "cylinder",
                radiusTop: 0.15,
                radiusBottom: 1.7,
                height: 3.4,
                segments: 4,
                position: [-4.1, 11.7, 0],
                color: 0x5c4035
            }]
        },
        row_house: {
            base: {
                floors: 3,
                floorHeight: 2.75,
                color: 0xc89072,
                inset: 0
            },
            roof: {
                enabled: true,
                type: "gable",
                color: 0x6b2f2a,
                height: 2.1,
                overhang: 0.3
            },
            windows: {
                enabled: true,
                width: 0.8,
                height: 1.0,
                rows: 3,
                gap: 0.35,
                frameColor: 0xf3eadc,
                glassColor: 0x8ebbd0
            },
            parts: [{
                type: "box",
                size: [0.08, 8.2, 7.8],
                position: [-2.1, 4.1, 0],
                color: 0x8e5a46
            }, {
                type: "box",
                size: [0.08, 8.2, 7.8],
                position: [2.1, 4.1, 0],
                color: 0x8e5a46
            }]
        },
        alpine_hotel: {
            base: {
                floors: 4,
                floorHeight: 2.9,
                color: 0xd9c7aa,
                inset: 0.05
            },
            roof: {
                enabled: true,
                type: "gable",
                color: 0x714031,
                height: 3.2,
                overhang: 0.75,
                ridgeDirection: "longest"
            },
            windows: {
                enabled: true,
                width: 0.9,
                height: 1.05,
                rows: 4,
                gap: 0.5,
                frameColor: 0xf6efe4,
                glassColor: 0x86bbd1
            },
            parts: [{
                type: "box",
                size: [8.2, 0.32, 1.0],
                position: [0, 3.25, -4.35],
                color: 0x6d3f24
            }, {
                type: "box",
                size: [8.2, 0.32, 1.0],
                position: [0, 6.15, -4.35],
                color: 0x6d3f24
            }]
        },
        logistics_warehouse: {
            base: {
                floors: 1,
                floorHeight: 6.2,
                color: 0xaeb7bd,
                inset: 0
            },
            roof: {
                enabled: true,
                type: "flat",
                color: 0x59636b
            },
            windows: {
                enabled: false
            },
            parts: [{
                type: "box",
                size: [3.6, 4.0, 0.16],
                position: [-2.5, 2.05, -4.45],
                color: 0x3f4850
            }, {
                type: "box",
                size: [3.6, 4.0, 0.16],
                position: [2.5, 2.05, -4.45],
                color: 0x3f4850
            }]
        },
        school_building: {
            base: {
                floors: 3,
                floorHeight: 3.1,
                color: 0xc9b98f,
                inset: 0.02
            },
            roof: {
                enabled: true,
                type: "flat",
                color: 0x5c6268
            },
            windows: {
                enabled: true,
                width: 1.25,
                height: 1.15,
                rows: 3,
                gap: 0.35,
                frameColor: 0xf5ead7,
                glassColor: 0x8fbdd0
            },
            parts: [{
                type: "panel",
                size: [5.5, 0.8, 0.08],
                position: [0, 3.2, -4.08],
                color: 0x265c8a
            }]
        },
        fire_station: {
            base: {
                floors: 2,
                floorHeight: 3.4,
                color: 0xb83a33,
                inset: 0
            },
            roof: {
                enabled: true,
                type: "flat",
                color: 0x4c5157
            },
            windows: {
                enabled: true,
                width: 0.95,
                height: 1.1,
                rows: 2,
                gap: 0.55,
                frameColor: 0xffffff,
                glassColor: 0x98c7d8
            },
            parts: [{
                type: "box",
                size: [3.0, 3.2, 0.16],
                position: [-1.8, 1.65, -4.18],
                color: 0x2e3438
            }, {
                type: "box",
                size: [3.0, 3.2, 0.16],
                position: [1.8, 1.65, -4.18],
                color: 0x2e3438
            }]
        },
        railway_station: {
            base: {
                floors: 2,
                floorHeight: 3.0,
                color: 0xd0c3ad,
                inset: 0.04
            },
            roof: {
                enabled: true,
                type: "gable",
                color: 0x646b72,
                height: 2.0,
                overhang: 0.6,
                ridgeDirection: "longest"
            },
            windows: {
                enabled: true,
                width: 1.0,
                height: 1.25,
                rows: 2,
                gap: 0.55,
                frameColor: 0xf4eee6,
                glassColor: 0x8bbbd0
            },
            parts: [{
                type: "box",
                size: [10.0, 0.22, 2.2],
                position: [0, 3.2, -4.8],
                color: 0x7a828a
            }]
        },
        lakeside_cottage: {
            base: {
                floors: 1,
                floorHeight: 3.0,
                color: 0xcab58e,
                inset: 0.08
            },
            roof: {
                enabled: true,
                type: "gable",
                color: 0x47605a,
                height: 2.5,
                overhang: 0.65
            },
            windows: {
                enabled: true,
                width: 0.85,
                height: 1.05,
                rows: 1,
                gap: 0.75,
                frameColor: 0xf4eee6,
                glassColor: 0x88bcd2
            },
            parts: [{
                type: "box",
                size: [6.5, 0.25, 1.8],
                position: [0, 1.15, -4.5],
                color: 0x7b5533
            }]
        },
        supermarket_block: {
            base: {
                floors: 1,
                floorHeight: 4.4,
                color: 0xd6d2c5,
                inset: 0
            },
            roof: {
                enabled: true,
                type: "flat",
                color: 0x3a4148
            },
            windows: {
                enabled: true,
                width: 1.55,
                height: 1.5,
                rows: 1,
                gap: 0.2,
                frameColor: 0xf4eee6,
                glassColor: 0x8fc5d9
            },
            parts: [{
                type: "panel",
                size: [7.8, 0.95, 0.08],
                position: [0, 3.7, -4.1],
                color: 0x2a8f55
            }, {
                type: "box",
                size: [2.2, 2.8, 0.15],
                position: [0, 1.5, -4.18],
                color: 0x2f444c
            }]
        },
        modeler_house_demo: {
            base: {
                enabled: false
            },
            roof: {
                enabled: false
            },
            windows: {
                enabled: false
            },
            parts: [{
                type: "wall",
                size: [7.2, 3.2, 0.24],
                position: [0, 1.6, -3.6],
                rotation: [0, 0, 0],
                color: 0xd8c6a6
            }, {
                type: "wall",
                size: [7.2, 3.2, 0.24],
                position: [0, 1.6, 3.6],
                rotation: [0, 0, 0],
                color: 0xd8c6a6
            }, {
                type: "wall",
                size: [7.2, 3.2, 0.24],
                position: [-3.6, 1.6, 0],
                rotation: [0, 90, 0],
                color: 0xcbb58f
            }, {
                type: "wall",
                size: [7.2, 3.2, 0.24],
                position: [3.6, 1.6, 0],
                rotation: [0, 90, 0],
                color: 0xcbb58f
            }, {
                type: "cylinderWall",
                radiusX: 2.4,
                radiusZ: 1.25,
                height: 3.2,
                thickness: 0.2,
                angle: 140,
                thetaStart: -70,
                segments: 28,
                position: [0, 1.6, -3.2],
                rotation: [0, 0, 0],
                color: 0xd9c7aa
            }, {
                type: "pyramidRoof",
                size: [8.4, 2.4, 8.4],
                sides: 4,
                topMode: "ridge",
                ridgeLength: 4.6,
                ridgeDirection: "x",
                position: [0, 4.4, 0],
                rotation: [0, 0, 0],
                color: 0x7f3d32
            }]
        }
    },
    buildings: [{
        id: "example_chalet_replace_me",
        template: "chalet_house",
        textureUrl: "https://toni857.github.io/my-textures/type1me.png",
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
    }, {
        id: "example_city_apartment_replace_me",
        template: "city_apartment",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_glass_office_replace_me",
        template: "glass_office",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_petrol_station_replace_me",
        template: "petrol_station",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_village_church_replace_me",
        template: "village_church",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_row_house_replace_me",
        template: "row_house",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_alpine_hotel_replace_me",
        template: "alpine_hotel",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_logistics_warehouse_replace_me",
        template: "logistics_warehouse",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_school_building_replace_me",
        template: "school_building",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_fire_station_replace_me",
        template: "fire_station",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_railway_station_replace_me",
        template: "railway_station",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_lakeside_cottage_replace_me",
        template: "lakeside_cottage",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_supermarket_block_replace_me",
        template: "supermarket_block",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }, {
        id: "example_modeler_house_replace_me",
        template: "modeler_house_demo",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        }
    }]
};
