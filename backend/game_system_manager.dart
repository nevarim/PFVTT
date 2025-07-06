import 'dart:io';
import 'dart:convert';
import 'package:mysql1/mysql1.dart';

class GameSystemManager {
  static const String gamesPath = 'games';
  
  /// Get the character sheet template for a specific game system
  static Future<Map<String, dynamic>?> getCharacterSheetTemplate(String folderName) async {
    try {
      final file = File('$gamesPath/$folderName/character_sheet.json');
      if (!await file.exists()) {
        print('Character sheet template not found for system: $folderName');
        return null;
      }
      
      final content = await file.readAsString();
      return json.decode(content) as Map<String, dynamic>;
    } catch (e) {
      print('Error loading character sheet template for $folderName: $e');
      return null;
    }
  }
  
  /// Get all available game systems from the database
  static Future<List<Map<String, dynamic>>> getAvailableGameSystems(MySqlConnection connection) async {
    try {
      final results = await connection.query(
        'SELECT id, system, folder_name, rules_json FROM game_rules ORDER BY system'
      );
      
      return results.map((row) => {
        'id': row['id'],
        'system': row['system'],
        'folder_name': row['folder_name'],
        'rules_json': row['rules_json'],
      }).toList();
    } catch (e) {
      print('Error fetching game systems: $e');
      return [];
    }
  }
  
  /// Get game system info by ID
  static Future<Map<String, dynamic>?> getGameSystemById(MySqlConnection connection, int gameRulesId) async {
    try {
      final results = await connection.query(
        'SELECT id, system, folder_name, rules_json FROM game_rules WHERE id = ?',
        [gameRulesId]
      );
      
      if (results.isEmpty) {
        return null;
      }
      
      final row = results.first;
      return {
        'id': row['id'],
        'system': row['system'],
        'folder_name': row['folder_name'],
        'rules_json': row['rules_json'],
      };
    } catch (e) {
      print('Error fetching game system by ID $gameRulesId: $e');
      return null;
    }
  }
  
  /// Get the folder name for a campaign's game system
  static Future<String?> getCampaignGameSystemFolder(MySqlConnection connection, int campaignId) async {
    try {
      final results = await connection.query(
        'SELECT gr.folder_name FROM campaigns c '
        'JOIN game_rules gr ON c.game_rules_id = gr.id '
        'WHERE c.id = ?',
        [campaignId]
      );
      
      if (results.isEmpty) {
        return null;
      }
      
      return results.first['folder_name'] as String;
    } catch (e) {
      print('Error fetching campaign game system folder: $e');
      return null;
    }
  }
  
  /// Get additional game data (classes, races, etc.) for a specific system
  static Future<Map<String, dynamic>?> getGameData(String folderName, String dataType) async {
    try {
      final file = File('$gamesPath/$folderName/$dataType.json');
      if (!await file.exists()) {
        print('Game data file not found: $folderName/$dataType.json');
        return null;
      }
      
      final content = await file.readAsString();
      return json.decode(content) as Map<String, dynamic>;
    } catch (e) {
      print('Error loading game data $dataType for $folderName: $e');
      return null;
    }
  }
  
  /// Get metadata for a specific game system
  static Future<Map<String, dynamic>?> getGameMetadata(String folderName) async {
    try {
      final file = File('$gamesPath/$folderName/metadata.json');
      if (!await file.exists()) {
        print('Metadata file not found for system: $folderName');
        return null;
      }
      
      final content = await file.readAsString();
      return json.decode(content) as Map<String, dynamic>;
    } catch (e) {
      print('Error loading metadata for $folderName: $e');
      return null;
    }
  }
  
  /// Validate if a game system folder exists
  static Future<bool> validateGameSystemFolder(String folderName) async {
    try {
      final directory = Directory('$gamesPath/$folderName');
      final characterSheetFile = File('$gamesPath/$folderName/character_sheet.json');
      
      return await directory.exists() && await characterSheetFile.exists();
    } catch (e) {
      print('Error validating game system folder $folderName: $e');
      return false;
    }
  }
  
  /// Get all available data types for a specific game system
  static Future<List<String>> getAvailableDataTypes(String folderName) async {
    try {
      final directory = Directory('$gamesPath/$folderName');
      if (!await directory.exists()) {
        return [];
      }
      
      final files = await directory.list().toList();
      final dataTypes = <String>[];
      
      for (final file in files) {
        if (file is File && file.path.endsWith('.json')) {
          final fileName = file.path.split('/').last.replaceAll('.json', '');
          if (fileName != 'character_sheet' && fileName != 'metadata') {
            dataTypes.add(fileName);
          }
        }
      }
      
      return dataTypes;
    } catch (e) {
      print('Error getting available data types for $folderName: $e');
      return [];
    }
  }
}