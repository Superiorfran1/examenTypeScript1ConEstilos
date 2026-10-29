export interface Tipo {
    id:                    number;
    name:                  string;
    damage_relations:      DamageRelations;
    past_damage_relations: unknown[];
    game_indices:          GameIndex[];
    generation:            Generation;
    move_damage_class:     Generation;
    names:                 Name[];
    pokemon:               Pokemon[];
    moves:                 Generation[];
    sprites:               Sprites;
}

export interface DamageRelations {
    no_damage_to:       Generation[];
    half_damage_to:     Generation[];
    double_damage_to:   unknown[];
    no_damage_from:     Generation[];
    half_damage_from:   unknown[];
    double_damage_from: Generation[];
}

export interface Generation {
    name: string;
    url:  string;
}

export interface GameIndex {
    game_index: number;
    generation: Generation;
}

export interface Name {
    name:     string;
    language: Generation;
}

export interface Pokemon {
    slot:    number;
    pokemon: Generation;
}

export interface Sprites {
    "generation-v":    GenerationV;
    "generation-iv":   GenerationIv;
    "generation-ix":   GenerationIx;
    "generation-vi":   { [key: string]: Colosseum };
    "generation-iii":  GenerationIii;
    "generation-vii":  GenerationVii;
    "generation-viii": GenerationViii;
}

export interface GenerationIii {
    xd:                  Colosseum;
    emerald:             Colosseum;
    colosseum:           Colosseum;
    "ruby-sapphire":     Colosseum;
    "firered-leafgreen": Colosseum;
}

export interface Colosseum {
    name_icon:   string;
    symbol_icon: null | string;
}

export interface GenerationIv {
    platinum:               Colosseum;
    "diamond-pearl":        Colosseum;
    "heartgold-soulsilver": Colosseum;
}

export interface GenerationIx {
    "scarlet-violet": Colosseum;
}

export interface GenerationV {
    "black-white":     Colosseum;
    "black-2-white-2": Colosseum;
}

export interface GenerationVii {
    "sun-moon":                      Colosseum;
    "ultra-sun-ultra-moon":          Colosseum;
    "lets-go-pikachu-lets-go-eevee": Colosseum;
}

export interface GenerationViii {
    "sword-shield":                    Colosseum;
    "legends-arceus":                  Colosseum;
    "brilliant-diamond-shining-pearl": Colosseum;
}
