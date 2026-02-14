export declare const MAP_WIDTH = 1200;
export declare const MAP_HEIGHT = 800;
export declare const COORDINATE_SCALE = 100;
export declare const STARFIELD_LAYERS = 3;
export declare const STARS_PER_LAYER = 100;
export declare const SHIP_SPEED = 5;
export declare const SHIP_ROTATION_SPEED = 0.1;
export declare const SPEED_SCALE_FACTOR = 0.01;
export declare const SPEED_BASE_NORMAL = 320;
export declare const SPEED_MAX_FAST = 580;
export declare const LASER_AMMO: {
    readonly 'LC-10': {
        readonly multiplier: 1;
        readonly name: "LC-10";
    };
    readonly 'LC-25': {
        readonly multiplier: 2;
        readonly name: "LC-25";
    };
    readonly 'LC-50': {
        readonly multiplier: 3;
        readonly name: "LC-50";
    };
    readonly 'LC-100': {
        readonly multiplier: 4;
        readonly name: "LC-100";
    };
    readonly 'RS-75': {
        readonly multiplier: 6;
        readonly name: "RS-75";
    };
};
export declare const LASER_CANNONS: {
    readonly 'PL-1': {
        readonly maxDamage: 65;
        readonly name: "PL-1";
    };
    readonly 'BL-1': {
        readonly maxDamage: 70;
        readonly name: "BL-1";
    };
    readonly 'PL-2': {
        readonly maxDamage: 140;
        readonly name: "PL-2";
    };
    readonly 'PL-3': {
        readonly maxDamage: 175;
        readonly name: "PL-3";
    };
};
export declare const ROCKETS: {
    readonly 'RT-01': {
        readonly maxDamage: 1000;
        readonly name: "RT-01";
    };
    readonly 'RT-02': {
        readonly maxDamage: 2000;
        readonly name: "RT-02";
    };
    readonly 'RT-03': {
        readonly maxDamage: 4000;
        readonly name: "RT-03";
    };
    readonly 'RT-04': {
        readonly maxDamage: 6000;
        readonly name: "RT-04";
    };
};
export declare const SPARROW_SHIP: {
    readonly name: "Sparrow";
    readonly cost: 0;
    readonly baseSpeed: 320;
    readonly cargo: 100;
    readonly laserSlots: 1;
    readonly generatorSlots: 1;
    readonly extrasSlots: 1;
    readonly hitpoints: 4000;
};
export declare const PLAYER_STATS: {
    MAX_HEALTH: 4000;
    DAMAGE: number;
    STARTING_LASER_CANNON: "PL-1";
    STARTING_LASER_AMMO: "LC-10";
    STARTING_ROCKET: "RT-01";
};
export declare const ENEMY_STATS: {
    DRIFTER: {
        MAX_HEALTH: number;
        MAX_SHIELD: number;
        DAMAGE: number;
        NAME: string;
        BASE_SPEED: number;
        ATTITUDE: "defensive";
        REWARD: {
            experience: number;
            honor: number;
            credits: number;
            aetherium: number;
        };
    };
};
export declare const COMBAT_CONFIG: {
    FIRING_RATE: number;
    LASER_SPEED: number;
    LASER_LENGTH: number;
    LASER_WIDTH: number;
    LASER_COLOR: number;
    LASER_GLOW_ALPHA: number;
    COMBAT_RANGE: number;
    PLAYER_RANGE: number;
    ENEMY_RANGE: number;
    LASER_TIMEOUT: number;
};
export declare const ROCKET_CONFIG: {
    SPEED: number;
    DAMAGE: number;
    FIRING_RATE: number;
    LENGTH: number;
    WIDTH: number;
    COLOR: number;
    TIMEOUT: number;
};
export declare const HP_BAR_CONFIG: {
    WIDTH: number;
    HEIGHT: number;
    OFFSET_Y: number;
    BORDER_WIDTH: number;
    GAP: number;
};
export declare const SHIELD_BAR_CONFIG: {
    WIDTH: number;
    HEIGHT: number;
    OFFSET_Y: number;
    BORDER_WIDTH: number;
    COLOR: number;
};
export declare const BASE_SAFETY_ZONE: {
    RADIUS: number;
    POSITION: {
        x: number;
        y: number;
    };
};
export declare const LEVELING_CONFIG: {
    readonly BASE_EXP: 10000;
    readonly EXP_MULTIPLIER: 2;
    readonly STARTING_LEVEL: 1;
    readonly MAX_LEVEL: 44;
};
export declare const DAMAGE_NUMBER_CONFIG: {
    readonly DURATION: 1500;
    readonly FLOAT_DISTANCE: 40;
    readonly START_SCALE: 1;
    readonly END_SCALE: 1.5;
    readonly START_ALPHA: 1;
    readonly END_ALPHA: 0;
    readonly FONT_SIZE: 18;
    readonly FONT_FAMILY: "Arial, sans-serif";
    readonly FONT_WEIGHT: "bold";
    readonly PLAYER_DAMAGE_COLOR: 16711680;
    readonly ENEMY_DAMAGE_COLOR: 16711935;
    readonly OFFSET_Y: -30;
    readonly RANDOM_OFFSET_X: 10;
};
export declare const BONUS_BOX_CONFIG: {
    readonly COUNT: 5;
    readonly RESPAWN_TIME: 5000;
    readonly CLICK_RADIUS: 30;
    readonly REWARDS: readonly [{
        readonly type: "credits";
        readonly amounts: readonly [200, 500, 1000];
        readonly weight: 40;
    }, {
        readonly type: "aetherium";
        readonly amounts: readonly [20, 50, 100];
        readonly weight: 20;
    }, {
        readonly type: "ammo";
        readonly ammoType: "LC-10";
        readonly amounts: readonly [10, 20, 50];
        readonly weight: 20;
    }, {
        readonly type: "ammo";
        readonly ammoType: "LC-25";
        readonly amounts: readonly [5, 10, 20];
        readonly weight: 10;
    }, {
        readonly type: "ammo";
        readonly ammoType: "LC-50";
        readonly amounts: readonly [5, 10, 20];
        readonly weight: 10;
    }];
};
export declare const ORE_CONFIG: {
    readonly PYRITE: {
        readonly type: "Pyrite";
        readonly color: 16729156;
        readonly clusterSize: {
            readonly min: 10;
            readonly max: 20;
        };
        readonly spawnRate: 0.8;
        readonly cargoSpace: 1;
        readonly size: "small";
        readonly resaleValue: 10;
    };
    readonly BERYL: {
        readonly type: "Beryl";
        readonly color: 4474111;
        readonly spawnRate: 0.2;
        readonly cargoSpace: 1;
        readonly size: "small";
        readonly resaleValue: 15;
    };
    readonly CITRINE: {
        readonly type: "Citrine";
        readonly color: 16777028;
        readonly spawnRate: 0;
        readonly cargoSpace: 1;
        readonly size: "small";
        readonly resaleValue: 30;
    };
    readonly ROSEON: {
        readonly type: "Roseon";
        readonly color: 16737996;
        readonly cargoSpace: 1;
        readonly size: "large";
        readonly resaleValue: 200;
    };
    readonly VERIDIAN: {
        readonly type: "Veridian";
        readonly color: 4521796;
        readonly cargoSpace: 1;
        readonly size: "large";
        readonly resaleValue: 200;
    };
    readonly AURUM: {
        readonly type: "Aurum";
        readonly color: 16766720;
        readonly cargoSpace: 1;
        readonly size: "large";
        readonly resaleValue: 1000;
    };
    readonly UMBRA: {
        readonly type: "Umbra";
        readonly color: 9109759;
        readonly cargoSpace: 1;
        readonly size: "small";
    };
    readonly ARGENT: {
        readonly type: "Argent";
        readonly color: 16777215;
        readonly cargoSpace: 1;
        readonly size: "small";
    };
};
export declare const ORE_REFINING_RECIPES: {
    readonly ROSEON: {
        readonly ingredients: Record<string, number>;
        readonly result: "Roseon";
    };
    readonly VERIDIAN: {
        readonly ingredients: Record<string, number>;
        readonly result: "Veridian";
    };
    readonly AURUM: {
        readonly ingredients: Record<string, number>;
        readonly result: "Aurum";
    };
};
//# sourceMappingURL=constants.d.ts.map