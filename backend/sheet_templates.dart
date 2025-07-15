
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