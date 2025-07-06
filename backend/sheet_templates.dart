import 'dart:convert';
import 'package:mysql1/mysql1.dart';
import 'game_system_manager.dart';

class SheetTemplates {
  /// Get a character sheet template based on the campaign's game system
  static Future<Map<String, dynamic>> getCharacterSheetTemplate(MySqlConnection connection, int campaignId) async {
    try {
      // Get the game system folder for this campaign
      final folderName = await GameSystemManager.getCampaignGameSystemFolder(connection, campaignId);
      
      if (folderName == null) {
        print('No game system found for campaign $campaignId, using generic template');
        return _getGenericTemplate();
      }
      
      // Load the character sheet template from the game system folder
      final template = await GameSystemManager.getCharacterSheetTemplate(folderName);
      
      if (template == null) {
        print('Character sheet template not found for system $folderName, using generic template');
        return _getGenericTemplate();
      }
      
      // Add system information to the template
      template['system'] = folderName;
      return template;
    } catch (e) {
      print('Error getting character sheet template: $e');
      return _getGenericTemplate();
    }
  }

  static Map<String, dynamic> _dnd5eTemplate() {
    return {
      'system': 'D&D 5e',
      'character': {
        'name': '',
        'class': '',
        'level': 1,
        'race': '',
        'background': '',
        'alignment': ''
      },
      'abilities': {
        'strength': {'score': 10, 'modifier': 0},
        'dexterity': {'score': 10, 'modifier': 0},
        'constitution': {'score': 10, 'modifier': 0},
        'intelligence': {'score': 10, 'modifier': 0},
        'wisdom': {'score': 10, 'modifier': 0},
        'charisma': {'score': 10, 'modifier': 0}
      },
      'combat': {
        'armor_class': 10,
        'hit_points': {'current': 1, 'maximum': 1, 'temporary': 0},
        'speed': 30,
        'proficiency_bonus': 2
      },
      'saving_throws': {
        'strength': {'proficient': false, 'bonus': 0},
        'dexterity': {'proficient': false, 'bonus': 0},
        'constitution': {'proficient': false, 'bonus': 0},
        'intelligence': {'proficient': false, 'bonus': 0},
        'wisdom': {'proficient': false, 'bonus': 0},
        'charisma': {'proficient': false, 'bonus': 0}
      },
      'skills': {
        'acrobatics': {'proficient': false, 'expertise': false},
        'animal_handling': {'proficient': false, 'expertise': false},
        'arcana': {'proficient': false, 'expertise': false},
        'athletics': {'proficient': false, 'expertise': false},
        'deception': {'proficient': false, 'expertise': false},
        'history': {'proficient': false, 'expertise': false},
        'insight': {'proficient': false, 'expertise': false},
        'intimidation': {'proficient': false, 'expertise': false},
        'investigation': {'proficient': false, 'expertise': false},
        'medicine': {'proficient': false, 'expertise': false},
        'nature': {'proficient': false, 'expertise': false},
        'perception': {'proficient': false, 'expertise': false},
        'performance': {'proficient': false, 'expertise': false},
        'persuasion': {'proficient': false, 'expertise': false},
        'religion': {'proficient': false, 'expertise': false},
        'sleight_of_hand': {'proficient': false, 'expertise': false},
        'stealth': {'proficient': false, 'expertise': false},
        'survival': {'proficient': false, 'expertise': false}
      },
      'equipment': {
        'weapons': [],
        'armor': [],
        'items': [],
        'currency': {'cp': 0, 'sp': 0, 'ep': 0, 'gp': 0, 'pp': 0}
      },
      'spells': {
        'spellcasting_ability': '',
        'spell_attack_bonus': 0,
        'spell_save_dc': 8,
        'spell_slots': {
          '1': {'total': 0, 'used': 0},
          '2': {'total': 0, 'used': 0},
          '3': {'total': 0, 'used': 0},
          '4': {'total': 0, 'used': 0},
          '5': {'total': 0, 'used': 0},
          '6': {'total': 0, 'used': 0},
          '7': {'total': 0, 'used': 0},
          '8': {'total': 0, 'used': 0},
          '9': {'total': 0, 'used': 0}
        },
        'known_spells': []
      },
      'features': [],
      'notes': ''
    };
  }

  static Map<String, dynamic> _pathfinderTemplate() {
    return {
      'system': 'Pathfinder',
      'character': {
        'name': '',
        'class': '',
        'level': 1,
        'race': '',
        'alignment': '',
        'deity': '',
        'homeland': '',
        'favored_class': ''
      },
      'abilities': {
        'strength': {'score': 10, 'modifier': 0, 'temp_modifier': 0},
        'dexterity': {'score': 10, 'modifier': 0, 'temp_modifier': 0},
        'constitution': {'score': 10, 'modifier': 0, 'temp_modifier': 0},
        'intelligence': {'score': 10, 'modifier': 0, 'temp_modifier': 0},
        'wisdom': {'score': 10, 'modifier': 0, 'temp_modifier': 0},
        'charisma': {'score': 10, 'modifier': 0, 'temp_modifier': 0}
      },
      'combat': {
        'armor_class': {'total': 10, 'armor': 0, 'shield': 0, 'dex': 0, 'size': 0, 'natural': 0, 'deflection': 0, 'misc': 0},
        'hit_points': {'current': 1, 'maximum': 1, 'temporary': 0},
        'base_attack_bonus': 0,
        'spell_resistance': 0,
        'damage_reduction': '',
        'speed': {'base': 30, 'armor': 30, 'fly': 0, 'swim': 0, 'climb': 0, 'burrow': 0}
      },
      'saving_throws': {
        'fortitude': {'base': 0, 'ability': 0, 'magic': 0, 'misc': 0, 'temp': 0},
        'reflex': {'base': 0, 'ability': 0, 'magic': 0, 'misc': 0, 'temp': 0},
        'will': {'base': 0, 'ability': 0, 'magic': 0, 'misc': 0, 'temp': 0}
      },
      'skills': {
        'acrobatics': {'ranks': 0, 'class_skill': false, 'ability': 'dex'},
        'appraise': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'bluff': {'ranks': 0, 'class_skill': false, 'ability': 'cha'},
        'climb': {'ranks': 0, 'class_skill': false, 'ability': 'str'},
        'craft': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'diplomacy': {'ranks': 0, 'class_skill': false, 'ability': 'cha'},
        'disable_device': {'ranks': 0, 'class_skill': false, 'ability': 'dex'},
        'disguise': {'ranks': 0, 'class_skill': false, 'ability': 'cha'},
        'escape_artist': {'ranks': 0, 'class_skill': false, 'ability': 'dex'},
        'fly': {'ranks': 0, 'class_skill': false, 'ability': 'dex'},
        'handle_animal': {'ranks': 0, 'class_skill': false, 'ability': 'cha'},
        'heal': {'ranks': 0, 'class_skill': false, 'ability': 'wis'},
        'intimidate': {'ranks': 0, 'class_skill': false, 'ability': 'cha'},
        'knowledge_arcana': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'knowledge_dungeoneering': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'knowledge_engineering': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'knowledge_geography': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'knowledge_history': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'knowledge_local': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'knowledge_nature': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'knowledge_nobility': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'knowledge_planes': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'knowledge_religion': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'linguistics': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'perception': {'ranks': 0, 'class_skill': false, 'ability': 'wis'},
        'perform': {'ranks': 0, 'class_skill': false, 'ability': 'cha'},
        'profession': {'ranks': 0, 'class_skill': false, 'ability': 'wis'},
        'ride': {'ranks': 0, 'class_skill': false, 'ability': 'dex'},
        'sense_motive': {'ranks': 0, 'class_skill': false, 'ability': 'wis'},
        'sleight_of_hand': {'ranks': 0, 'class_skill': false, 'ability': 'dex'},
        'spellcraft': {'ranks': 0, 'class_skill': false, 'ability': 'int'},
        'stealth': {'ranks': 0, 'class_skill': false, 'ability': 'dex'},
        'survival': {'ranks': 0, 'class_skill': false, 'ability': 'wis'},
        'swim': {'ranks': 0, 'class_skill': false, 'ability': 'str'},
        'use_magic_device': {'ranks': 0, 'class_skill': false, 'ability': 'cha'}
      },
      'feats': [],
      'traits': [],
      'equipment': {
        'weapons': [],
        'armor': [],
        'items': [],
        'currency': {'cp': 0, 'sp': 0, 'gp': 0, 'pp': 0}
      },
      'spells': {
        'spells_per_day': {
          '0': {'total': 0, 'used': 0},
          '1': {'total': 0, 'used': 0},
          '2': {'total': 0, 'used': 0},
          '3': {'total': 0, 'used': 0},
          '4': {'total': 0, 'used': 0},
          '5': {'total': 0, 'used': 0},
          '6': {'total': 0, 'used': 0},
          '7': {'total': 0, 'used': 0},
          '8': {'total': 0, 'used': 0},
          '9': {'total': 0, 'used': 0}
        },
        'known_spells': [],
        'spell_like_abilities': []
      },
      'class_features': [],
      'notes': ''
    };
  }

  static Map<String, dynamic> _pathfinder2Template() {
    return {
      'system': 'Pathfinder 2',
      'character': {
        'name': '',
        'class': '',
        'level': 1,
        'ancestry': '',
        'heritage': '',
        'background': '',
        'alignment': '',
        'deity': '',
        'size': 'Medium'
      },
      'abilities': {
        'strength': {'score': 10, 'modifier': 0},
        'dexterity': {'score': 10, 'modifier': 0},
        'constitution': {'score': 10, 'modifier': 0},
        'intelligence': {'score': 10, 'modifier': 0},
        'wisdom': {'score': 10, 'modifier': 0},
        'charisma': {'score': 10, 'modifier': 0}
      },
      'proficiencies': {
        'perception': {'rank': 'untrained', 'bonus': 0},
        'fortitude': {'rank': 'untrained', 'bonus': 0},
        'reflex': {'rank': 'untrained', 'bonus': 0},
        'will': {'rank': 'untrained', 'bonus': 0},
        'class_dc': {'rank': 'untrained', 'bonus': 0}
      },
      'combat': {
        'armor_class': 10,
        'hit_points': {'current': 1, 'maximum': 1, 'temporary': 0},
        'speed': 25,
        'hero_points': 1
      },
      'skills': {
        'acrobatics': {'rank': 'untrained', 'bonus': 0},
        'arcana': {'rank': 'untrained', 'bonus': 0},
        'athletics': {'rank': 'untrained', 'bonus': 0},
        'crafting': {'rank': 'untrained', 'bonus': 0},
        'deception': {'rank': 'untrained', 'bonus': 0},
        'diplomacy': {'rank': 'untrained', 'bonus': 0},
        'intimidation': {'rank': 'untrained', 'bonus': 0},
        'lore': {'rank': 'untrained', 'bonus': 0},
        'medicine': {'rank': 'untrained', 'bonus': 0},
        'nature': {'rank': 'untrained', 'bonus': 0},
        'occultism': {'rank': 'untrained', 'bonus': 0},
        'performance': {'rank': 'untrained', 'bonus': 0},
        'religion': {'rank': 'untrained', 'bonus': 0},
        'society': {'rank': 'untrained', 'bonus': 0},
        'stealth': {'rank': 'untrained', 'bonus': 0},
        'survival': {'rank': 'untrained', 'bonus': 0},
        'thievery': {'rank': 'untrained', 'bonus': 0}
      },
      'feats': [],
      'equipment': {
        'weapons': [],
        'armor': [],
        'items': [],
        'currency': {'cp': 0, 'sp': 0, 'gp': 0, 'pp': 0}
      },
      'spells': {
        'spell_attack': 0,
        'spell_dc': 10,
        'spell_slots': {
          'cantrips': {'total': 0, 'used': 0},
          '1': {'total': 0, 'used': 0},
          '2': {'total': 0, 'used': 0},
          '3': {'total': 0, 'used': 0},
          '4': {'total': 0, 'used': 0},
          '5': {'total': 0, 'used': 0},
          '6': {'total': 0, 'used': 0},
          '7': {'total': 0, 'used': 0},
          '8': {'total': 0, 'used': 0},
          '9': {'total': 0, 'used': 0},
          '10': {'total': 0, 'used': 0}
        },
        'known_spells': []
      },
      'actions': [],
      'notes': ''
    };
  }

  static Map<String, dynamic> _dnd35Template() {
    return {
      'system': 'D&D 3.5',
      'character': {
        'name': '',
        'class': '',
        'level': 1,
        'race': '',
        'alignment': '',
        'deity': '',
        'size': 'Medium',
        'gender': '',
        'age': 0,
        'height': '',
        'weight': '',
        'eyes': '',
        'hair': '',
        'skin': ''
      },
      'abilities': {
        'strength': {'score': 10, 'modifier': 0, 'temp_score': 10, 'temp_modifier': 0},
        'dexterity': {'score': 10, 'modifier': 0, 'temp_score': 10, 'temp_modifier': 0},
        'constitution': {'score': 10, 'modifier': 0, 'temp_score': 10, 'temp_modifier': 0},
        'intelligence': {'score': 10, 'modifier': 0, 'temp_score': 10, 'temp_modifier': 0},
        'wisdom': {'score': 10, 'modifier': 0, 'temp_score': 10, 'temp_modifier': 0},
        'charisma': {'score': 10, 'modifier': 0, 'temp_score': 10, 'temp_modifier': 0}
      },
      'combat': {
        'armor_class': {'total': 10, 'armor': 0, 'shield': 0, 'dex': 0, 'size': 0, 'natural': 0, 'deflection': 0, 'misc': 0},
        'hit_points': {'current': 1, 'maximum': 1, 'temporary': 0},
        'base_attack_bonus': 0,
        'spell_resistance': 0,
        'damage_reduction': '',
        'speed': {'base': 30, 'armor': 30, 'fly': 0, 'swim': 0, 'climb': 0, 'burrow': 0}
      },
      'saving_throws': {
        'fortitude': {'base': 0, 'ability': 0, 'magic': 0, 'misc': 0, 'temp': 0},
        'reflex': {'base': 0, 'ability': 0, 'magic': 0, 'misc': 0, 'temp': 0},
        'will': {'base': 0, 'ability': 0, 'magic': 0, 'misc': 0, 'temp': 0}
      },
      'skills': {
        'appraise': {'ranks': 0, 'ability': 'int', 'misc': 0},
        'balance': {'ranks': 0, 'ability': 'dex', 'misc': 0},
        'bluff': {'ranks': 0, 'ability': 'cha', 'misc': 0},
        'climb': {'ranks': 0, 'ability': 'str', 'misc': 0},
        'concentration': {'ranks': 0, 'ability': 'con', 'misc': 0},
        'craft': {'ranks': 0, 'ability': 'int', 'misc': 0},
        'decipher_script': {'ranks': 0, 'ability': 'int', 'misc': 0},
        'diplomacy': {'ranks': 0, 'ability': 'cha', 'misc': 0},
        'disable_device': {'ranks': 0, 'ability': 'int', 'misc': 0},
        'disguise': {'ranks': 0, 'ability': 'cha', 'misc': 0},
        'escape_artist': {'ranks': 0, 'ability': 'dex', 'misc': 0},
        'forgery': {'ranks': 0, 'ability': 'int', 'misc': 0},
        'gather_information': {'ranks': 0, 'ability': 'cha', 'misc': 0},
        'handle_animal': {'ranks': 0, 'ability': 'cha', 'misc': 0},
        'heal': {'ranks': 0, 'ability': 'wis', 'misc': 0},
        'hide': {'ranks': 0, 'ability': 'dex', 'misc': 0},
        'intimidate': {'ranks': 0, 'ability': 'cha', 'misc': 0},
        'jump': {'ranks': 0, 'ability': 'str', 'misc': 0},
        'knowledge': {'ranks': 0, 'ability': 'int', 'misc': 0},
        'listen': {'ranks': 0, 'ability': 'wis', 'misc': 0},
        'move_silently': {'ranks': 0, 'ability': 'dex', 'misc': 0},
        'open_lock': {'ranks': 0, 'ability': 'dex', 'misc': 0},
        'perform': {'ranks': 0, 'ability': 'cha', 'misc': 0},
        'profession': {'ranks': 0, 'ability': 'wis', 'misc': 0},
        'ride': {'ranks': 0, 'ability': 'dex', 'misc': 0},
        'search': {'ranks': 0, 'ability': 'int', 'misc': 0},
        'sense_motive': {'ranks': 0, 'ability': 'wis', 'misc': 0},
        'sleight_of_hand': {'ranks': 0, 'ability': 'dex', 'misc': 0},
        'spellcraft': {'ranks': 0, 'ability': 'int', 'misc': 0},
        'spot': {'ranks': 0, 'ability': 'wis', 'misc': 0},
        'survival': {'ranks': 0, 'ability': 'wis', 'misc': 0},
        'swim': {'ranks': 0, 'ability': 'str', 'misc': 0},
        'tumble': {'ranks': 0, 'ability': 'dex', 'misc': 0},
        'use_magic_device': {'ranks': 0, 'ability': 'cha', 'misc': 0},
        'use_rope': {'ranks': 0, 'ability': 'dex', 'misc': 0}
      },
      'feats': [],
      'equipment': {
        'weapons': [],
        'armor': [],
        'items': [],
        'currency': {'cp': 0, 'sp': 0, 'gp': 0, 'pp': 0}
      },
      'spells': {
        'spells_per_day': {
          '0': {'total': 0, 'used': 0},
          '1': {'total': 0, 'used': 0},
          '2': {'total': 0, 'used': 0},
          '3': {'total': 0, 'used': 0},
          '4': {'total': 0, 'used': 0},
          '5': {'total': 0, 'used': 0},
          '6': {'total': 0, 'used': 0},
          '7': {'total': 0, 'used': 0},
          '8': {'total': 0, 'used': 0},
          '9': {'total': 0, 'used': 0}
        },
        'known_spells': [],
        'spell_like_abilities': []
      },
      'class_features': [],
      'notes': ''
    };
  }

  /// Generic fallback template when no specific system is found
  static Map<String, dynamic> _getGenericTemplate() {
    return {
      'system': 'Generic',
      'character': {
        'name': '',
        'type': '',
        'level': 1
      },
      'attributes': {
        'attribute1': {'name': 'Attribute 1', 'value': 0},
        'attribute2': {'name': 'Attribute 2', 'value': 0},
        'attribute3': {'name': 'Attribute 3', 'value': 0},
        'attribute4': {'name': 'Attribute 4', 'value': 0},
        'attribute5': {'name': 'Attribute 5', 'value': 0},
        'attribute6': {'name': 'Attribute 6', 'value': 0}
      },
      'stats': {
        'health': {'current': 1, 'maximum': 1},
        'defense': 10,
        'movement': 30
      },
      'skills': [],
      'equipment': [],
      'abilities': [],
      'notes': ''
    };
  }
}