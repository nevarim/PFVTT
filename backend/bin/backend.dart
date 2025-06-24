import 'dart:io';
import 'dart:convert';
import 'package:mysql1/mysql1.dart';
import 'package:bcrypt/bcrypt.dart';

Future<void> main(List<String> arguments) async {
  print('PFVTT backend main() started');
  final settings = ConnectionSettings(
    host: 'localhost',
    port: 3306,
    user: 'PFVTT',
    password: 'PFVTT',
    db: 'PFVTT',
  );
  final conn = await MySqlConnection.connect(settings);

  final server = await HttpServer.bind(InternetAddress.anyIPv4, 8080);
  print('Backend running on http://localhost:8080');

  await for (HttpRequest request in server) {
    try {
      if (request.uri.path == '/login' && request.method == 'POST') {
        String content = await utf8.decoder.bind(request).join();
        Map<String, String> params = {};
        if (request.headers.contentType?.mimeType == 'application/json') {
          params = Map<String, String>.from(jsonDecode(content));
        } else {
          params = Uri.splitQueryString(content);
        }
        final username = params['username'];
        final password = params['password'];
        if (username == null || password == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing credentials'}));
          await request.response.close();
          continue;
        }
        var results = await conn.query(
          'SELECT password_hash FROM users WHERE username = ?', [username]);
        if (results.isNotEmpty && BCrypt.checkpw(password, results.first[0])) {
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': true}));
        } else {
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Invalid credentials'}));
        }
        await request.response.close();
      } else if (request.uri.path == '/register' && request.method == 'POST') {
        String content = await utf8.decoder.bind(request).join();
        Map<String, String> params = {};
        if (request.headers.contentType?.mimeType == 'application/json') {
          params = Map<String, String>.from(jsonDecode(content));
        } else {
          params = Uri.splitQueryString(content);
        }
        final username = params['username'];
        final password = params['password'];
        if (username == null || password == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing credentials'}));
          await request.response.close();
          continue;
        }
        var exists = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
        if (exists.isNotEmpty) {
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'User already exists'}));
          await request.response.close();
          continue;
        }
        final hash = BCrypt.hashpw(password, BCrypt.gensalt());
        await conn.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true}));
        await request.response.close();
      } else if (request.uri.path == '/map') {
        // Fetch map data from the database
        final username = request.uri.queryParameters['username'];
        List<Map<String, dynamic>> maps = [];
        if (username != null) {
          var userRes = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
          if (userRes.isNotEmpty) {
            final userId = userRes.first[0];
            var results = await conn.query('SELECT id, name, data, created_at FROM maps WHERE created_by = ?', [userId]);
            for (var row in results) {
              maps.add({'id': row[0], 'name': row[1], 'data': row[2], 'created_at': row[3].toString()});
            }
          }
        } else {
          var results = await conn.query('SELECT id, name, data, created_at FROM maps');
          for (var row in results) {
            maps.add({'id': row[0], 'name': row[1], 'data': row[2], 'created_at': row[3].toString()});
          }
        }
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true, 'maps': maps}));
        await request.response.close();
      } else if (request.uri.path == '/rules' || request.uri.path == '/api/rules') {
        try {
          var results = await conn.query('SELECT id, system, rules_json FROM game_rules');
          List<Map<String, dynamic>> rules = [];
          for (var row in results) {
            var rulesJsonValue = row[2];
            if (rulesJsonValue is Blob) {
              rulesJsonValue = utf8.decode(rulesJsonValue.toBytes());
            } else if (rulesJsonValue is List<int>) {
              rulesJsonValue = utf8.decode(rulesJsonValue);
            } else if (rulesJsonValue is String) {
              // already a string, do nothing
            } else {
              rulesJsonValue = rulesJsonValue.toString();
            }
            rules.add({"id": row[0], "system": row[1], "rules_json": rulesJsonValue});
          }
          request.response.write(jsonEncode(rules));
        } catch (e, stack) {
          print('Error in /api/rules: \$e');
          print(stack);
          request.response.statusCode = HttpStatus.internalServerError;
          request.response.write("Server error: \$e");
        }
        await request.response.close();
      } else if (request.uri.path == '/campaigns' && request.method == 'POST') {
        print('Received POST /campaigns request');
        try {
          // Create a new campaign for the user
          String content = await utf8.decoder.bind(request).join();
          Map<String, dynamic> params = jsonDecode(content);
          final username = params['username'];
          final name = params['name'];
          final description = params['description'];
          final gameRulesId = params['game_rules_id'];
          final imageUrl = params['image_url'];
          if (username == null || name == null || gameRulesId == null) {
            request.response.statusCode = HttpStatus.badRequest;
            request.response.headers.contentType = ContentType.json;
            request.response.write(jsonEncode({'success': false, 'error': 'Missing username, campaign name, or game_rules_id'}));
            await request.response.close();
            return;
          }
          var userRes = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
          if (userRes.isEmpty) {
            request.response.statusCode = HttpStatus.badRequest;
            request.response.headers.contentType = ContentType.json;
            request.response.write(jsonEncode({'success': false, 'error': 'User not found'}));
            await request.response.close();
            return;
          }
          final userId = userRes.first[0];
          await conn.query('INSERT INTO campaigns (user_id, name, description, game_rules_id, image_url) VALUES (?, ?, ?, ?, ?)', [userId, name, description, gameRulesId, imageUrl]);
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': true}));
          await request.response.close();
        } catch (e, stack) {
          print('Error in POST /campaigns: \$e');
          print(stack);
          request.response.statusCode = HttpStatus.internalServerError;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': e.toString()}));
          await request.response.close();
        }
      } else if (request.uri.path == '/campaigns' && request.method == 'GET') {
        try {
          // List campaigns for the user
          final username = request.uri.queryParameters['username'];
          if (username == null) {
            request.response.statusCode = HttpStatus.badRequest;
            request.response.headers.contentType = ContentType.json;
            request.response.write(jsonEncode({'success': false, 'error': 'Missing username'}));
            await request.response.close();
            return;
          }
          var userRes = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
          if (userRes.isEmpty) {
            request.response.statusCode = HttpStatus.badRequest;
            request.response.headers.contentType = ContentType.json;
            request.response.write(jsonEncode({'success': false, 'error': 'User not found'}));
            await request.response.close();
            return;
          }
          final userId = userRes.first[0];
          var results = await conn.query('SELECT id, name, description, game_rules_id, image_url, created_at FROM campaigns WHERE user_id = ?', [userId]);
          List<Map<String, dynamic>> campaigns = [];
          for (var row in results) {
            var imageUrlValue = row[4];
            if (imageUrlValue is Blob) {
              imageUrlValue = utf8.decode(imageUrlValue.toBytes());
            } else if (imageUrlValue is List<int>) {
              imageUrlValue = utf8.decode(imageUrlValue);
            } else if (imageUrlValue is String) {
              // already a string, do nothing
            } else if (imageUrlValue != null) {
              imageUrlValue = imageUrlValue.toString();
            }
            campaigns.add({
              'id': row[0],
              'name': row[1]?.toString(),
              'description': row[2]?.toString(),
              'game_rules_id': row[3],
              'image_url': imageUrlValue,
              'created_at': row[5]?.toString()
            });
          }
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': true, 'campaigns': campaigns}));
          await request.response.close();
        } catch (e, stack) {
          print('Error in GET /campaigns: \$e');
          print(stack);
          request.response.statusCode = HttpStatus.internalServerError;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': e.toString()}));
          await request.response.close();
        }
      } else if (request.uri.path == '/campaigns/delete' && request.method == 'POST') {
        // Delete a campaign by id for the user
        String content = await utf8.decoder.bind(request).join();
        Map<String, dynamic> params = jsonDecode(content);
        final username = params['username'];
        final campaignId = params['campaign_id'];
        if (username == null || campaignId == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing username or campaign_id'}));
          await request.response.close();
          continue;
        }
        var userRes = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
        if (userRes.isEmpty) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'User not found'}));
          await request.response.close();
          continue;
        }
        final userId = userRes.first[0];
        await conn.query('DELETE FROM campaigns WHERE id = ? AND user_id = ?', [campaignId, userId]);
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true}));
        await request.response.close();
      }
      else if (request.uri.path == '/actors' && request.method == 'GET') {
        final campaignId = request.uri.queryParameters['campaign_id'];
        if (campaignId == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing campaign_id'}));
          await request.response.close();
          return;
        }
        var results = await conn.query('SELECT id, name, type, data, created_at FROM actors WHERE campaign_id = ?', [campaignId]);
        List<Map<String, dynamic>> actors = [];
        for (var row in results) {
          actors.add({'id': row[0], 'name': row[1], 'type': row[2], 'data': row[3], 'created_at': row[4].toString()});
        }
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true, 'actors': actors}));
        await request.response.close();
      } else if (request.uri.path == '/actors' && request.method == 'POST') {
        String content = await utf8.decoder.bind(request).join();
        Map<String, dynamic> params = jsonDecode(content);
        final campaignId = params['campaign_id'];
        final name = params['name'];
        final type = params['type'];
        final data = params['data'];
        if (campaignId == null || name == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing campaign_id or name'}));
          await request.response.close();
          return;
        }
        await conn.query('INSERT INTO actors (campaign_id, name, type, data) VALUES (?, ?, ?, ?)', [campaignId, name, type, jsonEncode(data)]);
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true}));
        await request.response.close();
      }
// --- API for scenes ---
      else if (request.uri.path == '/scenes' && request.method == 'GET') {
        final campaignId = request.uri.queryParameters['campaign_id'];
        if (campaignId == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing campaign_id'}));
          await request.response.close();
          return;
        }
        var results = await conn.query('SELECT id, name, data, created_at FROM scenes WHERE campaign_id = ?', [campaignId]);
        List<Map<String, dynamic>> scenes = [];
        for (var row in results) {
          scenes.add({'id': row[0], 'name': row[1], 'data': row[2], 'created_at': row[3].toString()});
        }
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true, 'scenes': scenes}));
        await request.response.close();
      } else if (request.uri.path == '/scenes' && request.method == 'POST') {
        String content = await utf8.decoder.bind(request).join();
        Map<String, dynamic> params = jsonDecode(content);
        final campaignId = params['campaign_id'];
        final name = params['name'];
        final data = params['data'];
        if (campaignId == null || name == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing campaign_id or name'}));
          await request.response.close();
          return;
        }
        await conn.query('INSERT INTO scenes (campaign_id, name, data) VALUES (?, ?, ?)', [campaignId, name, jsonEncode(data)]);
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true}));
        await request.response.close();
      }
// --- API for journals ---
      else if (request.uri.path == '/journals' && request.method == 'GET') {
        final campaignId = request.uri.queryParameters['campaign_id'];
        if (campaignId == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing campaign_id'}));
          await request.response.close();
          return;
        }
        var results = await conn.query('SELECT id, title, content, created_at FROM journals WHERE campaign_id = ?', [campaignId]);
        List<Map<String, dynamic>> journals = [];
        for (var row in results) {
          journals.add({'id': row[0], 'title': row[1], 'content': row[2], 'created_at': row[3].toString()});
        }
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true, 'journals': journals}));
        await request.response.close();
      } else if (request.uri.path == '/journals' && request.method == 'POST') {
        String content = await utf8.decoder.bind(request).join();
        Map<String, dynamic> params = jsonDecode(content);
        final campaignId = params['campaign_id'];
        final title = params['title'];
        final contentText = params['content'];
        if (campaignId == null || title == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing campaign_id or title'}));
          await request.response.close();
          return;
        }
        await conn.query('INSERT INTO journals (campaign_id, title, content) VALUES (?, ?, ?)', [campaignId, title, contentText]);
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true}));
        await request.response.close();
      }
// --- API for campaign permissions ---
      else if (request.uri.path == '/campaign_permissions' && request.method == 'GET') {
        final campaignId = request.uri.queryParameters['campaign_id'];
        if (campaignId == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing campaign_id'}));
          await request.response.close();
          return;
        }
        var results = await conn.query('SELECT user_id, role FROM campaign_permissions WHERE campaign_id = ?', [campaignId]);
        List<Map<String, dynamic>> permissions = [];
        for (var row in results) {
          permissions.add({'user_id': row[0], 'role': row[1]});
        }
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true, 'permissions': permissions}));
        await request.response.close();
      } else if (request.uri.path == '/campaign_permissions' && request.method == 'POST') {
        String content = await utf8.decoder.bind(request).join();
        Map<String, dynamic> params = jsonDecode(content);
        final campaignId = params['campaign_id'];
        final userId = params['user_id'];
        final role = params['role'];
        if (campaignId == null || userId == null || role == null) {
          request.response.statusCode = HttpStatus.badRequest;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': 'Missing campaign_id, user_id or role'}));
          await request.response.close();
          return;
        }
        await conn.query('INSERT INTO campaign_permissions (campaign_id, user_id, role) VALUES (?, ?, ?)', [campaignId, userId, role]);
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true}));
        await request.response.close();
      }
      else if (request.uri.path == '/debug/users' && request.method == 'GET') {
        print('Received GET /debug/users request');
        try {
          var results = await conn.query('SELECT id, username FROM users');
          print('Query executed, results: \$results');
          List<Map<String, dynamic>> users = [];
          for (var row in results) {
            print('Row: \$row');
            users.add({'id': row[0], 'username': row[1]});
          }
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': true, 'users': users}));
          await request.response.close();
        } catch (e, stack) {
          print('Error in /debug/users: \$e');
          print(stack);
          request.response.statusCode = HttpStatus.internalServerError;
          request.response.headers.contentType = ContentType.json;
          request.response.write(jsonEncode({'success': false, 'error': e.toString()}));
          await request.response.close();
        }
      } else {
        request.response.statusCode = HttpStatus.notFound;
        await request.response.close();
      }
    } catch (e) {
      request.response.statusCode = HttpStatus.internalServerError;
      request.response.write('Server error: \$e');
      await request.response.close();
    }
  }
}
