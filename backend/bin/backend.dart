import 'dart:io';
import 'dart:convert';
import 'dart:async';
import 'package:mysql1/mysql1.dart';
import 'package:bcrypt/bcrypt.dart';
import 'package:dotenv/dotenv.dart';
import '../sheet_templates.dart';
import '../game_system_manager.dart';

// Enhanced Logging functionality
File? _logFile;
File? _errorLogFile;
File? _debugLogFile;

Future<void> _initializeLogging() async {
  try {
    _logFile = File('d:\\github\\PFVTT\\backend\\backend.log');
    _errorLogFile = File('d:\\github\\PFVTT\\backend\\error.log');
    _debugLogFile = File('d:\\github\\PFVTT\\backend\\debug.log');

    // Clear log files on startup
    await _logFile!.writeAsString('');
    await _errorLogFile!.writeAsString('');
    await _debugLogFile!.writeAsString('');

    print('Backend log files initialized and cleared');
    await _writeLog('SYSTEM', 'Backend logging system initialized');
  } catch (e) {
    print('Failed to initialize logging: $e');
  }
}

Future<void> _writeLog(
  String level,
  String message, [
  String? stackTrace,
]) async {
  try {
    final timestamp = DateTime.now().toIso8601String();
    final logEntry =
        '[$timestamp] [$level] $message${stackTrace != null ? '\nStack: $stackTrace' : ''}\n';

    // Write to main log
    if (_logFile != null) {
      await _logFile!.writeAsString(logEntry, mode: FileMode.append);
    }

    // Write errors to separate error log
    if (level == 'ERROR' && _errorLogFile != null) {
      await _errorLogFile!.writeAsString(logEntry, mode: FileMode.append);
    }

    // Write debug info to debug log
    if (level == 'DEBUG' && _debugLogFile != null) {
      await _debugLogFile!.writeAsString(logEntry, mode: FileMode.append);
    }

    // Also print to console for immediate visibility
    print('[$level] $message');
  } catch (e) {
    print('Failed to write log: $e');
  }
}

Future<void> _logError(
  String message,
  dynamic error, [
  StackTrace? stackTrace,
]) async {
  await _writeLog('ERROR', '$message: $error', stackTrace?.toString());
}

Future<void> _logDebug(String message) async {
  await _writeLog('DEBUG', message);
}

Future<void> _logInfo(String message) async {
  await _writeLog('INFO', message);
}

// MySQL Connection Pool
class MySqlConnectionPool {
  final ConnectionSettings _settings;
  final int _maxConnections;
  final Duration _connectionTimeout;
  final List<MySqlConnection> _availableConnections = [];
  final List<MySqlConnection> _usedConnections = [];
  bool _isInitialized = false;

  MySqlConnectionPool({
    required ConnectionSettings settings,
    int maxConnections = 10,
    Duration connectionTimeout = const Duration(seconds: 30),
  }) : _settings = settings,
       _maxConnections = maxConnections,
       _connectionTimeout = connectionTimeout;

  Future<void> initialize() async {
    if (_isInitialized) return;

    // Create initial connections
    for (int i = 0; i < 3; i++) {
      try {
        final conn = await MySqlConnection.connect(
          _settings,
        ).timeout(_connectionTimeout);
        _availableConnections.add(conn);
      } catch (e) {
        print('Warning: Failed to create initial connection $i: $e');
      }
    }
    _isInitialized = true;
    print(
      'MySQL Connection Pool initialized with ${_availableConnections.length} connections',
    );
  }

  Future<MySqlConnection> _getConnection() async {
    print(
      '[POOL] Getting connection - Available: ${_availableConnections.length}, Used: ${_usedConnections.length}',
    );

    // Try to get an available connection
    if (_availableConnections.isNotEmpty) {
      final conn = _availableConnections.removeAt(0);
      _usedConnections.add(conn);
      print('[POOL] Reusing existing connection');
      return conn;
    }

    // Create new connection if under limit
    if (_usedConnections.length < _maxConnections) {
      try {
        print(
          '[POOL] Creating new connection (${_usedConnections.length + 1}/$_maxConnections)',
        );
        final conn = await MySqlConnection.connect(
          _settings,
        ).timeout(_connectionTimeout);
        _usedConnections.add(conn);
        print('[POOL] New connection created successfully');
        return conn;
      } catch (e) {
        print('[POOL] Failed to create new connection: $e');
        throw Exception('Failed to create new connection: $e');
      }
    }

    // Wait for a connection to become available (increased timeout)
    print('[POOL] Pool exhausted, waiting for available connection...');
    int attempts = 0;
    while (_availableConnections.isEmpty && attempts < 200) {
      // Increased from 50 to 200
      await Future.delayed(Duration(milliseconds: 100));
      attempts++;
      if (attempts % 50 == 0) {
        print('[POOL] Still waiting... attempt $attempts/200');
      }
    }

    if (_availableConnections.isNotEmpty) {
      final conn = _availableConnections.removeAt(0);
      _usedConnections.add(conn);
      print('[POOL] Got connection after waiting');
      return conn;
    }

    print('[POOL] Connection pool exhausted after 20 seconds');
    throw Exception('Connection pool exhausted after 20 seconds');
  }

  void _releaseConnection(MySqlConnection conn) {
    _usedConnections.remove(conn);
    _availableConnections.add(conn);
    print(
      '[POOL] Connection released - Available: ${_availableConnections.length}, Used: ${_usedConnections.length}',
    );
  }

  Future<Results> query(String sql, [List<Object?>? values]) async {
    print(
      '[POOL] Executing query: ${sql.substring(0, sql.length > 50 ? 50 : sql.length)}...',
    );
    final conn = await _getConnection();
    try {
      final result = await conn.query(sql, values).timeout(_connectionTimeout);
      print('[POOL] Query executed successfully');
      return result;
    } catch (e) {
      print('[POOL] Query failed: $e');
      // If connection is broken, don't return it to pool
      _usedConnections.remove(conn);
      try {
        await conn.close();
        print('[POOL] Broken connection closed');
      } catch (closeError) {
        print('[POOL] Error closing broken connection: $closeError');
      }
      rethrow;
    } finally {
      if (_usedConnections.contains(conn)) {
        _releaseConnection(conn);
      }
    }
  }

  Future<void> close() async {
    for (final conn in [..._availableConnections, ..._usedConnections]) {
      try {
        await conn.close();
      } catch (e) {
        print('Error closing connection: $e');
      }
    }
    _availableConnections.clear();
    _usedConnections.clear();
  }
}

late MySqlConnectionPool _connectionPool;

// Rate limiting variables and cleanup function removed

Future<void> main(List<String> arguments) async {
  try {
    print('PFVTT backend main() started');

    // Initialize logging
    await _initializeLogging();
    await _logInfo('PFVTT backend started - PID: $pid');
    await _logInfo('Dart version: ${Platform.version}');
    await _logInfo('Operating system: ${Platform.operatingSystem}');

    // Load environment variables
    var env = DotEnv(includePlatformEnvironment: true)..load(['../.env']);

    final dbHost = env['DB_HOST'] ?? 'localhost';
    final dbPort = int.tryParse(env['DB_PORT'] ?? '3306') ?? 3306;
    final dbUser = env['DB_USER'] ?? 'PFVTT';
    final dbPassword = env['DB_PASSWORD'] ?? 'PFVTT';
    final dbName = env['DB_NAME'] ?? 'PFVTT';
    final serverHost = env['SERVER_HOST'] ?? 'localhost';
    final serverPort = int.tryParse(env['SERVER_PORT'] ?? '8080') ?? 8080;
    final frontendPort = env['FRONTEND_PORT'] ?? '3000';

    print('[BACKEND] Database: $dbHost:$dbPort/$dbName');
    print('[BACKEND] Server will run on: $serverHost:$serverPort');
    print('[BACKEND] Frontend expected on port: $frontendPort');

    final settings = ConnectionSettings(
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      db: dbName,
    );

    // Initialize connection pool with increased capacity
    _connectionPool = MySqlConnectionPool(
      settings: settings,
      maxConnections: 20, // Increased from 10 to 20 for better concurrency
      connectionTimeout: Duration(seconds: 30),
    );

    await _connectionPool.initialize();
    await _logInfo('MySQL connection pool initialized successfully');

    // Periodic cache cleanup removed

    final server = await HttpServer.bind(InternetAddress.anyIPv4, serverPort);
    await _logInfo(
      'HTTP server bound to ${InternetAddress.anyIPv4}:$serverPort',
    );
    print('Backend running on http://$serverHost:$serverPort');

    // Wrap the server loop in a more robust error handler
    await _logInfo('Starting main server loop');
    int requestCount = 0;
    while (true) {
      try {
        await for (HttpRequest request in server) {
          requestCount++;
          try {
            await _logDebug(
              'Request #$requestCount received: ${request.method} ${request.uri.path}',
            );

            // Add CORS headers
            request.response.headers.add(
              'Access-Control-Allow-Origin',
              'http://$serverHost:$frontendPort',
            );
            request.response.headers.add(
              'Access-Control-Allow-Methods',
              'GET, POST, PUT, DELETE, OPTIONS',
            );
            request.response.headers.add(
              'Access-Control-Allow-Headers',
              'Content-Type, Authorization',
            );

            // Handle preflight OPTIONS requests
            if (request.method == 'OPTIONS') {
              request.response.statusCode = HttpStatus.ok;
              await request.response.close();
              continue;
            }

            // Logging removed to prevent file contention

            if (request.uri.path == '/login' && request.method == 'POST') {
              print('BACKEND /login chiamato');
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
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing credentials',
                  }),
                );
                await request.response.close();
                continue;
              }
              var results = await _connectionPool.query(
                'SELECT password_hash FROM users WHERE username = ?',
                [username],
              );
              if (results.isNotEmpty &&
                  BCrypt.checkpw(password, results.first[0])) {
                request.response.headers.contentType = ContentType.json;
                request.response.write(jsonEncode({'success': true}));
                // Logging removed to prevent file contention
              } else {
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Invalid credentials',
                  }),
                );
                // Logging removed to prevent file contention
              }
              await request.response.close();
            } else if (request.uri.path == '/register' &&
                request.method == 'POST') {
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
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing credentials',
                  }),
                );
                await request.response.close();
                continue;
              }
              var exists = await _connectionPool.query(
                'SELECT id FROM users WHERE username = ?',
                [username],
              );
              if (exists.isNotEmpty) {
                request.response.statusCode = HttpStatus.conflict;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'User already exists',
                  }),
                );
                await request.response.close();
                continue;
              }
              final hash = BCrypt.hashpw(password, BCrypt.gensalt());
              await _connectionPool.query(
                'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                [username, hash],
              );
              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              // Logging removed to prevent file contention
              await request.response.close();
            } else if (request.uri.path == '/api/reset_password' &&
                request.method == 'POST') {
              String content = await utf8.decoder.bind(request).join();
              Map<String, dynamic> params = jsonDecode(content);
              final user = params['user'];
              request.response.headers.contentType = ContentType.json;
              if (user == null || user.toString().trim().isEmpty) {
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'message': 'Missing username or email.',
                  }),
                );
              } else {
                // Mock password reset response
                request.response.write(
                  jsonEncode({
                    'success': true,
                    'message': 'Reset request received (mock).',
                  }),
                );
              }
              await request.response.close();
            } else if (request.uri.path == '/api/debug/check-map' &&
                request.method == 'GET') {
              // Debug endpoint to check if a map exists
              final mapId = request.uri.queryParameters['map_id'];
              if (mapId == null) {
                request.response.statusCode = 400;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': 'Missing map_id'}),
                );
                await request.response.close();
                continue;
              }

              try {
                print('DEBUG: Checking if map $mapId exists...');
                var results = await _connectionPool.query(
                  'SELECT id, name, campaign_id FROM maps WHERE id = ?',
                  [mapId],
                );
                print('DEBUG: Query completed. Found ${results.length} maps');

                if (results.isEmpty) {
                  print('DEBUG: Map $mapId does NOT exist');
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': true,
                      'exists': false,
                      'map_id': mapId,
                      'message': 'Map does not exist',
                    }),
                  );
                } else {
                  var row = results.first;
                  print(
                    'DEBUG: Map $mapId EXISTS - Name: ${row[1]}, Campaign: ${row[2]}',
                  );
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': true,
                      'exists': true,
                      'map_id': mapId,
                      'name': row[1]?.toString() ?? '',
                      'campaign_id': row[2]?.toString() ?? '',
                    }),
                  );
                }
                await request.response.close();
              } catch (e) {
                print('DEBUG: Error checking map $mapId: $e');
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': e.toString()}),
                );
                await request.response.close();
              }
              continue;
            } else if (request.uri.path == '/map' ||
                request.uri.path == '/api/maps') {
              if (request.method == 'GET') {
                // Fetch map data from the database
                final campaignIdStr =
                    request.uri.queryParameters['campaign_id'];
                if (campaignIdStr == null) {
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Missing campaign_id',
                    }),
                  );
                  await request.response.close();
                  continue;
                }

                int campaignId;
                try {
                  campaignId = int.parse(campaignIdStr);
                } catch (e) {
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid campaign_id format',
                    }),
                  );
                  await request.response.close();
                  continue;
                }

                var results = await _connectionPool.query(
                  'SELECT id, name, data, created_by, created_at FROM maps WHERE campaign_id = ?',
                  [campaignId],
                );
                List<Map<String, dynamic>> maps = [];
                for (var row in results) {
                  // Keep data as string to avoid serialization issues
                  String mapDataStr = row[2]?.toString() ?? '{}';

                  // Handle created_at field safely
                  String createdAtStr = '';
                  try {
                    createdAtStr = row[4]?.toString() ?? '';
                  } catch (e) {
                    createdAtStr = 'Unknown';
                  }

                  maps.add({
                    'id': row[0],
                    'name': row[1]?.toString() ?? '',
                    'data': mapDataStr,
                    'created_by': row[3]?.toString() ?? '',
                    'created_at': createdAtStr,
                  });
                }
                print('DEBUG: Retrieved ${maps.length} maps from database');
                stdout.flush();
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'maps': maps}),
                );
                await request.response.close();
                continue;
              } else if (request.method == 'POST') {
                // Create new map
                final body = await utf8.decoder.bind(request).join();
                final params = jsonDecode(body);
                final campaignId = params['campaign_id'];
                final name = params['name'];
                final data = params['data'];
                final username = params['username'];

                if (campaignId == null || name == null || username == null) {
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Missing campaign_id, name or username',
                    }),
                  );
                  await request.response.close();
                  continue;
                }

                var userRes = await _connectionPool.query(
                  'SELECT id FROM users WHERE username = ?',
                  [username],
                );
                if (userRes.isEmpty) {
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'User not found'}),
                  );
                  await request.response.close();
                  continue;
                }
                final userId = userRes.first[0];

                await _connectionPool.query(
                  'INSERT INTO maps (campaign_id, name, data, created_by) VALUES (?, ?, ?, ?)',
                  [campaignId, name, jsonEncode(data), userId],
                );
                request.response.headers.contentType = ContentType.json;
                request.response.write(jsonEncode({'success': true}));
                await request.response.close();
                continue;
              }
            } else if ((request.uri.path.startsWith('/maps/') ||
                    request.uri.path.startsWith('/api/maps/')) &&
                request.method == 'GET') {
              print(
                'DEBUG: Maps GET handler triggered for: ${request.uri.path}',
              );
              // Get single map by ID
              final pathParts = request.uri.path.split('/');
              final mapId =
                  request.uri.path.startsWith('/api/')
                      ? pathParts[3]
                      : pathParts[2];

              var results = await _connectionPool.query(
                'SELECT id, name, data, created_by, created_at FROM maps WHERE id = ?',
                [mapId],
              );
              if (results.isEmpty) {
                request.response.statusCode = 404;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': 'Map not found'}),
                );
                await request.response.close();
                continue;
              }

              var row = results.first;
              String mapDataStr = row[2]?.toString() ?? '{}';
              String createdAtStr = '';
              try {
                createdAtStr = row[4]?.toString() ?? '';
              } catch (e) {
                createdAtStr = 'Unknown';
              }

              Map<String, dynamic> map = {
                'id': row[0],
                'name': row[1]?.toString() ?? '',
                'data': mapDataStr,
                'created_by': row[3]?.toString() ?? '',
                'created_at': createdAtStr,
              };

              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true, 'map': map}));
              await request.response.close();
              continue;
            } else if ((request.uri.path.startsWith('/maps/') ||
                    request.uri.path.startsWith('/api/maps/')) &&
                !request.uri.path.startsWith('/api/map-') &&
                request.method == 'PUT') {
              // Update map
              final pathParts = request.uri.path.split('/');
              final mapId =
                  request.uri.path.startsWith('/api/')
                      ? pathParts[3]
                      : pathParts[2];
              final body = await utf8.decoder.bind(request).join();
              final params = jsonDecode(body);

              List<String> updateFields = [];
              List<dynamic> updateValues = [];

              if (params['name'] != null) {
                updateFields.add('name = ?');
                updateValues.add(params['name']);
              }

              // Complete the map update operation
              if (updateFields.isNotEmpty) {
                updateValues.add(mapId);
                await _connectionPool.query(
                  'UPDATE maps SET ${updateFields.join(', ')} WHERE id = ?',
                  updateValues,
                );
              }

              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
              continue;
            }
            // === TOKEN SHEETS API ===
            else if (request.uri.path == '/api/token-sheets' &&
                request.method == 'GET') {
              print('SUCCESS: Reached token-sheets GET handler');
              try {
                // List all token sheets for a map (by map_id)
                final mapId = request.uri.queryParameters['map_id'];
                if (mapId == null) {
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'Missing map_id'}),
                  );
                  await request.response.close();
                  continue;
                }
                var results = await _connectionPool.query(
                  'SELECT ts.id, ts.map_token_id, ts.actor_id, ts.sheet_json, ts.created_at, ts.updated_at, mt.name as token_name FROM token_sheets ts JOIN map_tokens mt ON ts.map_token_id = mt.id WHERE mt.map_id = ?',
                  [mapId],
                );
                List<Map<String, dynamic>> sheets = [];
                for (var row in results) {
                  // Convert sheet_json from Blob to String, then parse as JSON
                  dynamic sheetJsonData;
                  try {
                    final sheetJsonString = row[3]?.toString() ?? '{}';
                    sheetJsonData = jsonDecode(sheetJsonString);
                  } catch (e) {
                    print(
                      'Warning: Failed to parse sheet_json for token sheet ${row[0]}: $e',
                    );
                    sheetJsonData = {};
                  }

                  // Extract system from sheet_json if available
                  String? system;
                  if (sheetJsonData is Map<String, dynamic> &&
                      sheetJsonData.containsKey('system')) {
                    system = sheetJsonData['system']?.toString();
                  }

                  sheets.add({
                    'id': row[0],
                    'map_token_id': row[1],
                    'actor_id': row[2],
                    'sheet_json': sheetJsonData,
                    'system': system,
                    'created_at': row[4]?.toString() ?? '',
                    'updated_at': row[5]?.toString() ?? '',
                    'token_name': row[6]?.toString() ?? '',
                  });
                }
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'sheets': sheets}),
                );
                await request.response.close();
              } catch (e) {
                print('Error in GET /api/token-sheets: $e');
                request.response.statusCode = 500;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Database error: ${e.toString()}',
                  }),
                );
                await request.response.close();
              }
              continue;
            } else if (request.uri.path == '/api/token-sheets' &&
                request.method == 'POST') {
              // Create a new token sheet
              _logInfo('[BACKEND] Received POST request to create token sheet');
              final body = await utf8.decoder.bind(request).join();
              _logDebug('[BACKEND] Request body: $body');
              final params = jsonDecode(body);
              final mapTokenId = params['map_token_id'];
              final actorId = params['actor_id'];
              final sheetJson = params['sheet_json'];
              _logDebug(
                '[BACKEND] Parsed params - mapTokenId: $mapTokenId, actorId: $actorId',
              );
              if (mapTokenId == null || sheetJson == null) {
                _logError(
                  '[BACKEND] Error: Missing required parameters',
                  'Missing parameters',
                );
                request.response.statusCode = 400;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing map_token_id or sheet_json',
                  }),
                );
                await request.response.close();
                continue;
              }
              _logDebug('[BACKEND] Inserting new token sheet');
              var result = await _connectionPool.query(
                'INSERT INTO token_sheets (map_token_id, actor_id, sheet_json) VALUES (?, ?, ?)',
                [mapTokenId, actorId, jsonEncode(sheetJson)],
              );
              _logInfo(
                '[BACKEND] Created token sheet with ID: ${result.insertId}',
              );
              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'success': true, 'id': result.insertId}),
              );
              await request.response.close();
              continue;
            } else if (request.uri.path.startsWith('/api/token-sheets/') &&
                request.method == 'GET') {
              // Get a single token sheet by ID
              final id = request.uri.path.split('/').last;
              var results = await _connectionPool.query(
                'SELECT id, map_token_id, actor_id, sheet_json, created_at, updated_at FROM token_sheets WHERE id = ?',
                [id],
              );
              if (results.isEmpty) {
                request.response.statusCode = 404;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Token sheet not found',
                  }),
                );
                await request.response.close();
                continue;
              }
              var row = results.first;

              // Convert sheet_json from Blob to String, then parse as JSON
              dynamic sheetJsonData;
              try {
                final sheetJsonString = row[3]?.toString() ?? '{}';
                sheetJsonData = jsonDecode(sheetJsonString);
              } catch (e) {
                print(
                  'Warning: Failed to parse sheet_json for token sheet ${row[0]}: $e',
                );
                sheetJsonData = {};
              }

              // Extract system from sheet_json if available
              String? system;
              if (sheetJsonData is Map<String, dynamic> &&
                  sheetJsonData.containsKey('system')) {
                system = sheetJsonData['system']?.toString();
              }

              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({
                  'success': true,
                  'sheet': {
                    'id': row[0],
                    'map_token_id': row[1],
                    'actor_id': row[2],
                    'sheet_json': sheetJsonData,
                    'system': system,
                    'created_at': row[4]?.toString() ?? '',
                    'updated_at': row[5]?.toString() ?? '',
                  },
                }),
              );
              await request.response.close();
              continue;
            } else if (request.uri.path.startsWith('/api/token-sheets/') &&
                request.method == 'PUT') {
              // Update a token sheet by ID
              final id = request.uri.path.split('/').last;
              _logInfo(
                '[BACKEND] Received PUT request to update token sheet ID: $id',
              );
              final body = await utf8.decoder.bind(request).join();
              _logDebug('[BACKEND] Request body: $body');
              final params = jsonDecode(body);
              final sheetJson = params['sheet_json'];
              final actorId = params['actor_id'];
              _logDebug('[BACKEND] Parsed params - actorId: $actorId');
              if (sheetJson == null) {
                _logError(
                  '[BACKEND] Error: Missing sheet_json',
                  'Missing parameter',
                );
                request.response.statusCode = 400;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': 'Missing sheet_json'}),
                );
                await request.response.close();
                continue;
              }
              _logDebug('[BACKEND] Updating token sheet ID: $id');
              await _connectionPool.query(
                'UPDATE token_sheets SET sheet_json = ?, actor_id = ? WHERE id = ?',
                [jsonEncode(sheetJson), actorId, id],
              );
              _logInfo('[BACKEND] Successfully updated token sheet ID: $id');
              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
              continue;
            } else if (request.uri.path.startsWith('/api/token-sheets/') &&
                request.method == 'DELETE') {
              // Delete a token sheet by ID
              final id = request.uri.path.split('/').last;
              await _connectionPool.query(
                'DELETE FROM token_sheets WHERE id = ?',
                [id],
              );
              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
              continue;
            } else if (request.uri.path == '/api/token-sheets/auto-create' &&
                request.method == 'POST') {
              // Auto-create a token sheet based on campaign game rules
              print('[BACKEND] Received auto-create token sheet request');
              final body = await utf8.decoder.bind(request).join();
              print('[BACKEND] Request body: $body');
              final params = jsonDecode(body);
              final mapTokenId = params['map_token_id'];
              final tokenName = params['token_name'] ?? 'Token';
              print(
                '[BACKEND] Parsed params - mapTokenId: $mapTokenId, tokenName: $tokenName',
              );

              if (mapTokenId == null) {
                _logError(
                  '[BACKEND] Error: Missing map_token_id',
                  'Missing parameter',
                );
                request.response.statusCode = 400;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing map_token_id',
                  }),
                );
                await request.response.close();
                continue;
              }

              try {
                _logInfo(
                  '[BACKEND] Starting auto-create process for token $mapTokenId',
                );
                // Get campaign and game rules for this token
                _logDebug('[BACKEND] Querying token and campaign info');
                var tokenResults = await _connectionPool.query(
                  'SELECT mt.map_id, m.campaign_id FROM map_tokens mt JOIN maps m ON mt.map_id = m.id WHERE mt.id = ?',
                  [mapTokenId],
                );
                _logDebug(
                  '[BACKEND] Token query results: ${tokenResults.length} rows',
                );

                if (tokenResults.isEmpty) {
                  _logError(
                    '[BACKEND] Error: Token not found for ID $mapTokenId',
                    'Token not found',
                  );
                  request.response.statusCode = 404;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'Token not found'}),
                  );
                  await request.response.close();
                  continue;
                }

                final campaignId = tokenResults.first[1];
                _logDebug('[BACKEND] Found campaign ID: $campaignId');

                // Check if token already has a sheet
                _logDebug('[BACKEND] Checking for existing sheet');
                var existingSheetResults = await _connectionPool.query(
                  'SELECT id FROM token_sheets WHERE map_token_id = ?',
                  [mapTokenId],
                );
                _logDebug(
                  '[BACKEND] Existing sheet query results: ${existingSheetResults.length} rows',
                );

                if (existingSheetResults.isNotEmpty) {
                  final existingSheetId = existingSheetResults.first[0];
                  _logInfo(
                    '[BACKEND] Token already has a sheet with ID: $existingSheetId',
                  );
                  request.response.statusCode = 409;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Token already has a sheet',
                      'existing_sheet_id': existingSheetId,
                    }),
                  );
                  await request.response.close();
                  continue;
                }

                // Get a connection for the SheetTemplates call
                _logDebug(
                  '[BACKEND] Getting database connection for sheet template',
                );
                final conn = await _connectionPool._getConnection();
                try {
                  // Generate template based on campaign's game system
                  _logDebug(
                    '[BACKEND] Generating sheet template for campaign $campaignId',
                  );
                  Map<String, dynamic> sheetTemplate =
                      await SheetTemplates.getCharacterSheetTemplate(
                        conn,
                        campaignId,
                      );
                  _logDebug(
                    '[BACKEND] Generated template: ${sheetTemplate.keys.toList()}',
                  );
                  _logDebug(
                    '[BACKEND] Template system: ${sheetTemplate['system']}',
                  );

                  // Set the character name from token name
                  if (sheetTemplate.containsKey('name')) {
                    sheetTemplate['name'] = tokenName;
                    _logDebug('[BACKEND] Set character name to: $tokenName');
                  }

                  // Create the token sheet
                  _logDebug(
                    '[BACKEND] Inserting new token sheet into database',
                  );
                  var result = await _connectionPool.query(
                    'INSERT INTO token_sheets (map_token_id, actor_id, sheet_json) VALUES (?, ?, ?)',
                    [mapTokenId, null, jsonEncode(sheetTemplate)],
                  );
                  _logInfo(
                    '[BACKEND] Inserted sheet with ID: ${result.insertId}',
                  );

                  final responseData = {
                    'success': true,
                    'id': result.insertId,
                    'system': sheetTemplate['system'] ?? 'Generic',
                    'sheet_json': sheetTemplate,
                  };
                  _logDebug(
                    '[BACKEND] Sending success response: ${responseData.keys.toList()}',
                  );

                  request.response.headers.contentType = ContentType.json;
                  request.response.write(jsonEncode(responseData));
                  await request.response.close();
                  continue;
                } finally {
                  _logDebug('[BACKEND] Releasing database connection');
                  _connectionPool._releaseConnection(conn);
                }
              } catch (e) {
                _logError(
                  '[BACKEND] ERROR in auto-create token sheet',
                  e,
                );
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                final errorResponse = {
                  'success': false,
                  'error': 'Failed to create token sheet: ${e.toString()}',
                };
                _logInfo('[BACKEND] Sending error response: $errorResponse');
                request.response.write(jsonEncode(errorResponse));
                await request.response.close();
                continue;
              }
            } else if ((request.uri.path.startsWith('/maps/') ||
                    request.uri.path.startsWith('/api/maps/')) &&
                request.method == 'DELETE') {
              // Delete map
              final pathParts = request.uri.path.split('/');
              final mapId =
                  request.uri.path.startsWith('/api/')
                      ? pathParts[3]
                      : pathParts[2];

              await _connectionPool.query('DELETE FROM maps WHERE id = ?', [
                mapId,
              ]);

              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
              continue;
            } else if (request.uri.path == '/assets' ||
                request.uri.path == '/api/assets') {
              if (request.method == 'GET') {
                // Fetch assets for a campaign
                try {
                  final campaignId = request.uri.queryParameters['campaign_id'];
                  if (campaignId == null || campaignId.trim().isEmpty) {
                    request.response.statusCode = 400;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Missing or empty campaign_id',
                      }),
                    );
                    await request.response.close();
                    continue;
                  }

                  // Validate campaign_id format (should be numeric)
                  if (int.tryParse(campaignId) == null) {
                    request.response.statusCode = 400;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Invalid campaign_id format',
                      }),
                    );
                    await request.response.close();
                    continue;
                  }

                  var results = await _connectionPool
                      .query(
                        'SELECT id, name, category, file_url, file_size, mime_type, description, tags, created_at FROM assets WHERE campaign_id = ?',
                        [campaignId],
                      )
                      .timeout(Duration(seconds: 30));

                  List<Map<String, dynamic>> assets = [];
                  for (var row in results) {
                    var tagsValue = row[7];
                    if (tagsValue is String && tagsValue.isNotEmpty) {
                      try {
                        tagsValue = jsonDecode(tagsValue);
                      } catch (e) {
                        print(
                          'Warning: Failed to parse tags for asset ${row[0]}: $e',
                        );
                        tagsValue = [];
                      }
                    } else {
                      tagsValue = [];
                    }
                    assets.add({
                      'id': row[0]?.toString() ?? '',
                      'name': row[1]?.toString() ?? '',
                      'category': row[2]?.toString() ?? '',
                      'file_url': row[3]?.toString() ?? '',
                      'file_size': row[4]?.toString() ?? '0',
                      'mime_type': row[5]?.toString() ?? '',
                      'description': row[6]?.toString() ?? '',
                      'tags': tagsValue,
                      'created_at': row[8]?.toString() ?? '',
                    });
                  }
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': true, 'assets': assets}),
                  );
                  await request.response.close();
                } catch (e, stack) {
                  print('ERROR in GET /api/assets: $e');
                  print('ERROR Stack trace: $stack');
                  request.response.statusCode = 500;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Internal server error',
                    }),
                  );
                  await request.response.close();
                }
              } else if (request.method == 'POST') {
                // Create new asset (simplified - in real implementation would handle file upload)
                try {
                  final body = await utf8.decoder
                      .bind(request)
                      .join()
                      .timeout(Duration(seconds: 30));

                  Map<String, dynamic> params;
                  try {
                    params = jsonDecode(body);
                  } catch (e) {
                    request.response.statusCode = 400;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Invalid JSON format',
                      }),
                    );
                    await request.response.close();
                    continue;
                  }

                  final campaignId = params['campaign_id'];
                  final name = params['name'];
                  final category = params['category'];
                  final fileUrl = params['file_url'];
                  final fileSize = params['file_size'];
                  final mimeType = params['mime_type'];
                  final description = params['description'] ?? '';
                  final tags = params['tags'] ?? [];

                  // Validate required fields
                  if (campaignId == null ||
                      campaignId.toString().trim().isEmpty ||
                      name == null ||
                      name.toString().trim().isEmpty ||
                      category == null ||
                      category.toString().trim().isEmpty ||
                      fileUrl == null ||
                      fileUrl.toString().trim().isEmpty) {
                    request.response.statusCode = 400;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error':
                            'Missing or empty required fields: campaign_id, name, category, file_url',
                      }),
                    );
                    await request.response.close();
                    continue;
                  }

                  // Validate campaign_id format
                  if (int.tryParse(campaignId.toString()) == null) {
                    request.response.statusCode = 400;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Invalid campaign_id format',
                      }),
                    );
                    await request.response.close();
                    continue;
                  }

                  // Validate name length
                  if (name.toString().length > 255) {
                    request.response.statusCode = 400;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Asset name too long (max 255 characters)',
                      }),
                    );
                    await request.response.close();
                    continue;
                  }

                  var result = await _connectionPool
                      .query(
                        'INSERT INTO assets (campaign_id, name, category, file_url, file_size, mime_type, description, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                          campaignId,
                          name,
                          category,
                          fileUrl,
                          fileSize,
                          mimeType,
                          description,
                          jsonEncode(tags),
                        ],
                      )
                      .timeout(Duration(seconds: 30));

                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': true,
                      'asset_id': result.insertId,
                      'file_url': fileUrl,
                    }),
                  );
                  await request.response.close();
                } catch (e, stack) {
                  print('ERROR in POST /api/assets: $e');
                  print('ERROR Stack trace: $stack');
                  request.response.statusCode = 500;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Internal server error',
                    }),
                  );
                  await request.response.close();
                }
              }
            } else if ((request.uri.path.startsWith('/assets/') ||
                    request.uri.path.startsWith('/api/assets/')) &&
                request.method == 'PUT') {
              // Update asset
              try {
                final pathParts = request.uri.path.split('/');
                final assetId =
                    request.uri.path.startsWith('/api/')
                        ? pathParts[3]
                        : pathParts[2];

                // Validate asset ID
                if (assetId.isEmpty || int.tryParse(assetId) == null) {
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid asset ID format',
                    }),
                  );
                  await request.response.close();
                  continue;
                }

                final body = await utf8.decoder
                    .bind(request)
                    .join()
                    .timeout(Duration(seconds: 30));

                Map<String, dynamic> params;
                try {
                  params = jsonDecode(body);
                } catch (e) {
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid JSON format',
                    }),
                  );
                  await request.response.close();
                  continue;
                }

                List<String> updateFields = [];
                List<dynamic> updateValues = [];

                if (params['name'] != null) {
                  final name = params['name'].toString().trim();
                  if (name.isEmpty) {
                    request.response.statusCode = 400;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Asset name cannot be empty',
                      }),
                    );
                    await request.response.close();
                    continue;
                  }
                  if (name.length > 255) {
                    request.response.statusCode = 400;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Asset name too long (max 255 characters)',
                      }),
                    );
                    await request.response.close();
                    continue;
                  }
                  updateFields.add('name = ?');
                  updateValues.add(name);
                }
                if (params['description'] != null) {
                  updateFields.add('description = ?');
                  updateValues.add(params['description']);
                }
                if (params['tags'] != null) {
                  updateFields.add('tags = ?');
                  updateValues.add(jsonEncode(params['tags']));
                }

                if (updateFields.isEmpty) {
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'No fields to update',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                updateValues.add(assetId);
                var result = await _connectionPool
                    .query(
                      'UPDATE assets SET ${updateFields.join(', ')} WHERE id = ?',
                      updateValues,
                    )
                    .timeout(Duration(seconds: 30));

                // Check if asset was found and updated
                if (result.affectedRows == 0) {
                  request.response.statusCode = 404;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'Asset not found'}),
                  );
                  await request.response.close();
                  return;
                }

                request.response.headers.contentType = ContentType.json;
                request.response.write(jsonEncode({'success': true}));
                await request.response.close();
              } catch (e, stack) {
                print('ERROR in PUT /api/assets: $e');
                print('ERROR Stack trace: $stack');
                request.response.statusCode = 500;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Internal server error',
                  }),
                );
                await request.response.close();
              }
            } else if ((request.uri.path.startsWith('/assets/') ||
                    request.uri.path.startsWith('/api/assets/')) &&
                request.method == 'DELETE') {
              // Delete asset
              try {
                final pathParts = request.uri.path.split('/');
                final assetId =
                    request.uri.path.startsWith('/api/')
                        ? pathParts[3]
                        : pathParts[2];

                // Validate asset ID
                if (assetId.isEmpty || int.tryParse(assetId) == null) {
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid asset ID format',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                var result = await _connectionPool
                    .query('DELETE FROM assets WHERE id = ?', [assetId])
                    .timeout(Duration(seconds: 30));

                // Check if asset was found and deleted
                if (result.affectedRows == 0) {
                  request.response.statusCode = 404;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'Asset not found'}),
                  );
                  await request.response.close();
                  return;
                }

                request.response.headers.contentType = ContentType.json;
                request.response.write(jsonEncode({'success': true}));
                await request.response.close();
              } catch (e, stack) {
                print('ERROR in DELETE /api/assets: $e');
                print('ERROR Stack trace: $stack');
                request.response.statusCode = 500;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Internal server error',
                  }),
                );
                await request.response.close();
              }
            } else if ((request.uri.path.startsWith('/campaigns/') ||
                    request.uri.path.startsWith('/api/campaigns/')) &&
                request.uri.path.endsWith('/settings')) {
              final pathParts = request.uri.path.split('/');
              if (pathParts.length >= 3) {
                final campaignId =
                    request.uri.path.startsWith('/api/')
                        ? pathParts[3]
                        : pathParts[2];

                if (request.method == 'GET') {
                  // Get campaign settings
                  var results = await _connectionPool.query(
                    'SELECT settings FROM campaigns WHERE id = ?',
                    [campaignId],
                  );
                  if (results.isEmpty) {
                    request.response.statusCode = 404;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Campaign not found',
                      }),
                    );
                    await request.response.close();
                    continue;
                  }

                  var settingsValue = results.first[0];
                  Map<String, dynamic> settings = {};

                  if (settingsValue != null) {
                    if (settingsValue is String && settingsValue.isNotEmpty) {
                      try {
                        settings = jsonDecode(settingsValue);
                      } catch (e) {
                        settings = {};
                      }
                    } else if (settingsValue is Map) {
                      settings = Map<String, dynamic>.from(settingsValue);
                    }
                  }

                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': true, 'settings': settings}),
                  );
                  await request.response.close();
                } else if (request.method == 'PUT') {
                  // Update campaign settings
                  final body = await utf8.decoder.bind(request).join();
                  final params = jsonDecode(body);
                  final settings = params['settings'];

                  if (settings == null) {
                    request.response.statusCode = 400;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Missing settings',
                      }),
                    );
                    await request.response.close();
                    return;
                  }

                  await _connectionPool.query(
                    'UPDATE campaigns SET settings = ? WHERE id = ?',
                    [jsonEncode(settings), campaignId],
                  );

                  request.response.headers.contentType = ContentType.json;
                  request.response.write(jsonEncode({'success': true}));
                  await request.response.close();
                }
              }
            } else if (request.uri.path == '/rules' ||
                request.uri.path == '/api/rules') {
              if (request.method == 'GET') {
                try {
                  var results = await _connectionPool.query(
                    'SELECT id, system, folder_name, rules_json FROM game_rules',
                  );
                  List<Map<String, dynamic>> rules = [];
                  for (var row in results) {
                    var rulesJsonValue = row[3];
                    if (rulesJsonValue is Blob) {
                      rulesJsonValue = utf8.decode(rulesJsonValue.toBytes());
                    } else if (rulesJsonValue is List<int>) {
                      rulesJsonValue = utf8.decode(rulesJsonValue);
                    } else if (rulesJsonValue is String) {
                      // already a string, do nothing
                    } else {
                      rulesJsonValue = rulesJsonValue.toString();
                    }
                    rules.add({
                      "id": row[0],
                      "system": row[1],
                      "folder_name": row[2],
                      "rules_json": rulesJsonValue,
                    });
                  }
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(jsonEncode(rules));
                } catch (e, stack) {
                  print('Error in GET /api/rules: $e');
                  print('Stack trace: $stack');
                  stdout.flush();
                  request.response.statusCode = HttpStatus.internalServerError;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': e.toString()}),
                  );
                }
                await request.response.close();
              } else if (request.method == 'POST') {
                // Add new rule
                try {
                  String content = await utf8.decoder.bind(request).join();
                  Map<String, dynamic> params = jsonDecode(content);
                  final system = params['system'];
                  final folderName = params['folder_name'];
                  final rulesJson = params['rules_json'];
                  if (system == null || rulesJson == null) {
                    request.response.statusCode = HttpStatus.badRequest;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Missing system or rules_json',
                      }),
                    );
                    await request.response.close();
                    return;
                  }
                  await _connectionPool.query(
                    'INSERT INTO game_rules (system, folder_name, rules_json) VALUES (?, ?, ?)',
                    [system, folderName, rulesJson],
                  );
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(jsonEncode({'success': true}));
                  await request.response.close();
                } catch (e, stack) {
                  print('Error in POST /api/rules: \$e');
                  print(stack);
                  request.response.statusCode = HttpStatus.internalServerError;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': e.toString()}),
                  );
                  await request.response.close();
                }
              } else if (request.method == 'PUT') {
                // Edit rule
                try {
                  String content = await utf8.decoder.bind(request).join();
                  Map<String, dynamic> params = jsonDecode(content);
                  final id = params['id'];
                  final system = params['system'];
                  final folderName = params['folder_name'];
                  final rulesJson = params['rules_json'];
                  if (id == null || system == null || rulesJson == null) {
                    request.response.statusCode = HttpStatus.badRequest;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Missing id, system, or rules_json',
                      }),
                    );
                    await request.response.close();
                    return;
                  }
                  await _connectionPool.query(
                    'UPDATE game_rules SET system = ?, folder_name = ?, rules_json = ? WHERE id = ?',
                    [system, folderName, rulesJson, id],
                  );
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(jsonEncode({'success': true}));
                  await request.response.close();
                } catch (e, stack) {
                  print('Error in PUT /api/rules: \$e');
                  print(stack);
                  request.response.statusCode = HttpStatus.internalServerError;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': e.toString()}),
                  );
                  await request.response.close();
                }
              } else if (request.method == 'DELETE') {
                // Delete rule
                try {
                  String content = await utf8.decoder.bind(request).join();
                  Map<String, dynamic> params = jsonDecode(content);
                  final id = params['id'];
                  if (id == null) {
                    request.response.statusCode = HttpStatus.badRequest;
                    request.response.headers.contentType = ContentType.json;
                    request.response.write(
                      jsonEncode({'success': false, 'error': 'Missing id'}),
                    );
                    await request.response.close();
                    return;
                  }
                  await _connectionPool.query(
                    'DELETE FROM game_rules WHERE id = ?',
                    [id],
                  );
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(jsonEncode({'success': true}));
                  await request.response.close();
                } catch (e, stack) {
                  print('Error in DELETE /api/rules: \$e');
                  print(stack);
                  request.response.statusCode = HttpStatus.internalServerError;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': e.toString()}),
                  );
                  await request.response.close();
                }
              } else {
                request.response.statusCode = HttpStatus.methodNotAllowed;
                request.response.write('Method not allowed');
                await request.response.close();
              }
            } else if (request.uri.path == '/api/game-systems' &&
                request.method == 'GET') {
              // Get all available game systems
              try {
                final conn = await _connectionPool._getConnection();
                try {
                  final gameSystems =
                      await GameSystemManager.getAvailableGameSystems(conn);
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': true, 'game_systems': gameSystems}),
                  );
                } finally {
                  _connectionPool._releaseConnection(conn);
                }
              } catch (e, stack) {
                print('Error in GET /api/game-systems: $e');
                print(stack);
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': e.toString()}),
                );
              }
              await request.response.close();
            } else if (request.uri.path.startsWith('/api/game-systems/') &&
                request.method == 'GET') {
              // Get specific game system data
              try {
                final pathParts = request.uri.path.split('/');
                if (pathParts.length < 4) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid path format',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                final folderName = pathParts[3];
                final dataType =
                    request.uri.queryParameters['type'] ?? 'character_sheet';

                Map<String, dynamic>? gameData;
                if (dataType == 'character_sheet') {
                  gameData = await GameSystemManager.getCharacterSheetTemplate(
                    folderName,
                  );
                } else if (dataType == 'metadata') {
                  gameData = await GameSystemManager.getGameMetadata(
                    folderName,
                  );
                } else {
                  gameData = await GameSystemManager.getGameData(
                    folderName,
                    dataType,
                  );
                }

                if (gameData == null) {
                  request.response.statusCode = HttpStatus.notFound;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Game system data not found',
                    }),
                  );
                } else {
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': true, 'data': gameData}),
                  );
                }
              } catch (e, stack) {
                print('Error in GET /api/game-systems/[folder]: $e');
                print(stack);
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': e.toString()}),
                );
              }
              await request.response.close();
            } else if (request.uri.path.startsWith('/games/') &&
                request.uri.path.endsWith('/character_sheet.css') &&
                (request.method == 'GET' || request.method == 'HEAD')) {
              // Serve CSS files for game systems
              try {
                final pathParts = request.uri.path.split('/');
                if (pathParts.length >= 3) {
                  final systemName = pathParts[2];
                  final cssFile = File(
                    'd:/github/PFVTT/backend/games/$systemName/character_sheet.css',
                  );

                  if (await cssFile.exists()) {
                    request.response.headers.contentType = ContentType(
                      'text',
                      'css',
                      charset: 'utf-8',
                    );
                    if (request.method == 'GET') {
                      final cssContent = await cssFile.readAsString(
                        encoding: utf8,
                      );
                      final bytes = utf8.encode(cssContent);
                      request.response.add(bytes);
                    }
                    // For HEAD requests, we only send headers, no body
                    await request.response.close();
                  } else {
                    request.response.statusCode = HttpStatus.notFound;
                    request.response.headers.contentType = ContentType(
                      'text',
                      'plain',
                      charset: 'utf-8',
                    );
                    request.response.add(utf8.encode('CSS file not found'));
                    await request.response.close();
                  }
                } else {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType(
                    'text',
                    'plain',
                    charset: 'utf-8',
                  );
                  request.response.add(utf8.encode('Invalid path format'));
                  await request.response.close();
                }
              } catch (e) {
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType(
                  'text',
                  'plain',
                  charset: 'utf-8',
                );
                request.response.add(utf8.encode('Internal server error'));
                await request.response.close();
              }
            } else if ((request.uri.path == '/campaigns' ||
                    request.uri.path == '/api/campaigns') &&
                request.method == 'POST') {
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
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error':
                          'Missing username, campaign name, or game_rules_id',
                    }),
                  );
                  await request.response.close();
                  return;
                }
                var userRes = await _connectionPool.query(
                  'SELECT id FROM users WHERE username = ?',
                  [username],
                );
                if (userRes.isEmpty) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'User not found'}),
                  );
                  await request.response.close();
                  return;
                }
                final userId = userRes.first[0];
                await _connectionPool.query(
                  'INSERT INTO campaigns (user_id, name, description, game_rules_id, image_url) VALUES (?, ?, ?, ?, ?)',
                  [userId, name, description, gameRulesId, imageUrl],
                );
                request.response.headers.contentType = ContentType.json;
                request.response.write(jsonEncode({'success': true}));
                await request.response.close();
              } catch (e, stack) {
                print('Error in POST /campaigns: \$e');
                print(stack);
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': e.toString()}),
                );
                await request.response.close();
              }
            } else if ((request.uri.path == '/campaigns' ||
                    request.uri.path == '/api/campaigns') &&
                request.method == 'GET') {
              try {
                // List campaigns for the user
                final username = request.uri.queryParameters['username'];
                if (username == null) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'Missing username'}),
                  );
                  await request.response.close();
                  return;
                }
                var userRes = await _connectionPool.query(
                  'SELECT id FROM users WHERE username = ?',
                  [username],
                );
                if (userRes.isEmpty) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'User not found'}),
                  );
                  await request.response.close();
                  return;
                }
                final userId = userRes.first[0];
                var results = await _connectionPool.query(
                  'SELECT c.id, c.name, c.description, c.game_rules_id, c.image_url, c.created_at, c.background_image_url, gr.system FROM campaigns c LEFT JOIN game_rules gr ON c.game_rules_id = gr.id WHERE c.user_id = ?',
                  [userId],
                );
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

                  var backgroundImageUrlValue = row[6];
                  if (backgroundImageUrlValue is Blob) {
                    backgroundImageUrlValue = utf8.decode(
                      backgroundImageUrlValue.toBytes(),
                    );
                  } else if (backgroundImageUrlValue is List<int>) {
                    backgroundImageUrlValue = utf8.decode(
                      backgroundImageUrlValue,
                    );
                  } else if (backgroundImageUrlValue is String) {
                    // already a string, do nothing
                  } else if (backgroundImageUrlValue != null) {
                    backgroundImageUrlValue =
                        backgroundImageUrlValue.toString();
                  }

                  campaigns.add({
                    'id': row[0],
                    'name': row[1]?.toString(),
                    'description': row[2]?.toString(),
                    'game_rules_id': row[3],
                    'image_url': imageUrlValue,
                    'created_at': row[5]?.toString(),
                    'background_image_url': backgroundImageUrlValue,
                    'system': row[7]?.toString(),
                  });
                }
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'campaigns': campaigns}),
                );
                await request.response.close();
              } catch (e, stack) {
                print('Error in GET /campaigns: $e');
                print('Stack trace: $stack');
                stdout.flush();
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': e.toString()}),
                );
                await request.response.close();
              }
            } else if ((request.uri.path.startsWith('/campaigns/') ||
                    request.uri.path.startsWith('/api/campaigns/')) &&
                request.method == 'GET' &&
                !request.uri.path.endsWith('/settings')) {
              // Get single campaign by ID
              final pathParts = request.uri.path.split('/');
              final campaignId =
                  request.uri.path.startsWith('/api/')
                      ? pathParts[3]
                      : pathParts[2];

              var results = await _connectionPool.query(
                'SELECT c.id, c.name, c.description, c.game_rules_id, c.image_url, c.created_at, c.background_image_url, gr.system FROM campaigns c LEFT JOIN game_rules gr ON c.game_rules_id = gr.id WHERE c.id = ?',
                [campaignId],
              );
              if (results.isEmpty) {
                request.response.statusCode = 404;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': 'Campaign not found'}),
                );
                await request.response.close();
                return;
              }

              var row = results.first;
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

              var backgroundImageUrlValue = row[6];
              if (backgroundImageUrlValue is Blob) {
                backgroundImageUrlValue = utf8.decode(
                  backgroundImageUrlValue.toBytes(),
                );
              } else if (backgroundImageUrlValue is List<int>) {
                backgroundImageUrlValue = utf8.decode(backgroundImageUrlValue);
              } else if (backgroundImageUrlValue is String) {
                // already a string, do nothing
              } else if (backgroundImageUrlValue != null) {
                backgroundImageUrlValue = backgroundImageUrlValue.toString();
              }

              Map<String, dynamic> campaign = {
                'id': row[0],
                'name': row[1]?.toString(),
                'description': row[2]?.toString(),
                'game_rules_id': row[3],
                'image_url': imageUrlValue,
                'created_at': row[5]?.toString(),
                'background_image_url': backgroundImageUrlValue,
                'system': row[7]?.toString(),
              };

              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'success': true, 'campaign': campaign}),
              );
              await request.response.close();
            } else if (request.uri.path == '/campaigns/delete' &&
                request.method == 'POST') {
              // Delete a campaign by id for the user
              String content = await utf8.decoder.bind(request).join();
              Map<String, dynamic> params = jsonDecode(content);
              final username = params['username'];
              final campaignId = params['campaign_id'];
              if (username == null || campaignId == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing username or campaign_id',
                  }),
                );
                await request.response.close();
                continue;
              }
              var userRes = await _connectionPool.query(
                'SELECT id FROM users WHERE username = ?',
                [username],
              );
              if (userRes.isEmpty) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': 'User not found'}),
                );
                await request.response.close();
                continue;
              }
              final userId = userRes.first[0];
              await _connectionPool.query(
                'DELETE FROM campaigns WHERE id = ? AND user_id = ?',
                [campaignId, userId],
              );
              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
            } else if ((request.uri.path == '/actors' ||
                    request.uri.path == '/api/actors') &&
                request.method == 'GET') {
              final campaignId = request.uri.queryParameters['campaign_id'];
              if (campaignId == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing campaign_id',
                  }),
                );
                await request.response.close();
                return;
              }
              var results = await _connectionPool.query(
                'SELECT id, name, type, data, created_at FROM actors WHERE campaign_id = ?',
                [campaignId],
              );
              List<Map<String, dynamic>> actors = [];
              for (var row in results) {
                actors.add({
                  'id': row[0],
                  'name': row[1],
                  'type': row[2],
                  'data': row[3],
                  'created_at': row[4].toString(),
                });
              }
              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'success': true, 'actors': actors}),
              );
              await request.response.close();
            } else if ((request.uri.path == '/actors' ||
                    request.uri.path == '/api/actors') &&
                request.method == 'POST') {
              String content = await utf8.decoder.bind(request).join();
              Map<String, dynamic> params = jsonDecode(content);
              final campaignId = params['campaign_id'];
              final name = params['name'];
              final type = params['type'];
              final data = params['data'];
              if (campaignId == null || name == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing campaign_id or name',
                  }),
                );
                await request.response.close();
                return;
              }
              await _connectionPool.query(
                'INSERT INTO actors (campaign_id, name, type, data) VALUES (?, ?, ?, ?)',
                [campaignId, name, type, jsonEncode(data)],
              );
              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
            }
            // --- API for scenes ---
            else if ((request.uri.path == '/scenes' ||
                    request.uri.path == '/api/scenes') &&
                request.method == 'GET') {
              final campaignId = request.uri.queryParameters['campaign_id'];
              if (campaignId == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing campaign_id',
                  }),
                );
                await request.response.close();
                return;
              }
              var results = await _connectionPool.query(
                'SELECT id, name, data, created_at FROM scenes WHERE campaign_id = ?',
                [campaignId],
              );
              List<Map<String, dynamic>> scenes = [];
              for (var row in results) {
                var dataValue = row[2];
                String dataString;
                if (dataValue is Blob) {
                  dataString = utf8.decode(dataValue.toBytes());
                } else if (dataValue is List<int>) {
                  dataString = utf8.decode(dataValue);
                } else {
                  dataString = dataValue?.toString() ?? '{}';
                }
                scenes.add({
                  'id': row[0],
                  'name': row[1],
                  'data': dataString,
                  'created_at': row[3].toString(),
                });
              }
              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'success': true, 'scenes': scenes}),
              );
              await request.response.close();
            } else if ((request.uri.path == '/scenes' ||
                    request.uri.path == '/api/scenes') &&
                request.method == 'POST') {
              String content = await utf8.decoder.bind(request).join();
              Map<String, dynamic> params = jsonDecode(content);
              final campaignId = params['campaign_id'];
              final name = params['name'];
              final data = params['data'];
              if (campaignId == null || name == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing campaign_id or name',
                  }),
                );
                await request.response.close();
                return;
              }
              await _connectionPool.query(
                'INSERT INTO scenes (campaign_id, name, data) VALUES (?, ?, ?)',
                [campaignId, name, jsonEncode(data)],
              );
              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
            } else if ((request.uri.path.startsWith('/scenes/') ||
                    request.uri.path.startsWith('/api/scenes/')) &&
                request.method == 'PUT') {
              // Update scene
              final pathParts = request.uri.path.split('/');
              final sceneId =
                  request.uri.path.startsWith('/api/')
                      ? pathParts[3]
                      : pathParts[2];

              String content = await utf8.decoder.bind(request).join();
              Map<String, dynamic> params = jsonDecode(content);
              final name = params['name'];
              final data = params['data'];

              if (name == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': 'Missing name'}),
                );
                await request.response.close();
                return;
              }

              await _connectionPool.query(
                'UPDATE scenes SET name = ?, data = ? WHERE id = ?',
                [name, jsonEncode(data), sceneId],
              );

              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
            } else if ((request.uri.path.startsWith('/scenes/') ||
                    request.uri.path.startsWith('/api/scenes/')) &&
                request.method == 'DELETE') {
              // Delete scene
              final pathParts = request.uri.path.split('/');
              final sceneId =
                  request.uri.path.startsWith('/api/')
                      ? pathParts[3]
                      : pathParts[2];

              await _connectionPool.query('DELETE FROM scenes WHERE id = ?', [
                sceneId,
              ]);

              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
            }
            // --- API for journals ---
            else if ((request.uri.path == '/journals' ||
                    request.uri.path == '/api/journals') &&
                request.method == 'GET') {
              final campaignId = request.uri.queryParameters['campaign_id'];
              if (campaignId == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing campaign_id',
                  }),
                );
                await request.response.close();
                return;
              }
              var results = await _connectionPool.query(
                'SELECT id, title, content, created_at FROM journals WHERE campaign_id = ?',
                [campaignId],
              );
              List<Map<String, dynamic>> journals = [];
              for (var row in results) {
                journals.add({
                  'id': row[0],
                  'title': row[1],
                  'content': row[2],
                  'created_at': row[3].toString(),
                });
              }
              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'success': true, 'journals': journals}),
              );
              await request.response.close();
            } else if ((request.uri.path == '/journals' ||
                    request.uri.path == '/api/journals') &&
                request.method == 'POST') {
              String content = await utf8.decoder.bind(request).join();
              Map<String, dynamic> params = jsonDecode(content);
              final campaignId = params['campaign_id'];
              final title = params['title'];
              final contentText = params['content'];
              if (campaignId == null || title == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing campaign_id or title',
                  }),
                );
                await request.response.close();
                return;
              }
              await _connectionPool.query(
                'INSERT INTO journals (campaign_id, title, content) VALUES (?, ?, ?)',
                [campaignId, title, contentText],
              );
              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
            }
            // --- API for campaign permissions ---
            else if ((request.uri.path == '/campaign_permissions' ||
                    request.uri.path == '/api/campaign_permissions') &&
                request.method == 'GET') {
              final campaignId = request.uri.queryParameters['campaign_id'];
              if (campaignId == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing campaign_id',
                  }),
                );
                await request.response.close();
                return;
              }
              var results = await _connectionPool.query(
                'SELECT user_id, role FROM campaign_permissions WHERE campaign_id = ?',
                [campaignId],
              );
              List<Map<String, dynamic>> permissions = [];
              for (var row in results) {
                permissions.add({'user_id': row[0], 'role': row[1]});
              }
              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'success': true, 'permissions': permissions}),
              );
              await request.response.close();
            } else if ((request.uri.path == '/campaign_permissions' ||
                    request.uri.path == '/api/campaign_permissions') &&
                request.method == 'POST') {
              String content = await utf8.decoder.bind(request).join();
              Map<String, dynamic> params = jsonDecode(content);
              final campaignId = params['campaign_id'];
              final userId = params['user_id'];
              final role = params['role'];
              if (campaignId == null || userId == null || role == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing campaign_id, user_id or role',
                  }),
                );
                await request.response.close();
                return;
              }
              await _connectionPool.query(
                'INSERT INTO campaign_permissions (campaign_id, user_id, role) VALUES (?, ?, ?)',
                [campaignId, userId, role],
              );
              request.response.headers.contentType = ContentType.json;
              request.response.write(jsonEncode({'success': true}));
              await request.response.close();
            }
            // --- API for user_id ---
            else if ((request.uri.path == '/user_id' ||
                    request.uri.path == '/api/user_id') &&
                request.method == 'GET') {
              final username = request.uri.queryParameters['username'];
              if (username == null) {
                request.response.statusCode = HttpStatus.badRequest;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': 'Missing username'}),
                );
                await request.response.close();
                return;
              }
              try {
                var results = await _connectionPool.query(
                  'SELECT id FROM users WHERE username = ?',
                  [username],
                );
                if (results.isNotEmpty) {
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': true, 'user_id': results.first[0]}),
                  );
                } else {
                  request.response.statusCode = HttpStatus.notFound;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'User not found'}),
                  );
                }
                await request.response.close();
              } catch (e) {
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': e.toString()}),
                );
                await request.response.close();
              }
            }
            // --- API for campaign background upload ---
            else if ((request.uri.path == '/campaign-background-upload' ||
                    request.uri.path == '/api/campaign-background-upload') &&
                request.method == 'POST') {
              // Mock implementation for campaign background upload
              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({
                  'success': true,
                  'url': '/images/campaign/mock-background.jpg',
                }),
              );
              await request.response.close();
            }
            // --- API for campaign edit ---
            else if ((request.uri.path == '/campaigns/edit' ||
                    request.uri.path == '/api/campaigns/edit') &&
                request.method == 'POST') {
              try {
                String content = await utf8.decoder.bind(request).join();
                Map<String, dynamic> params = jsonDecode(content);
                final campaignId = params['campaign_id'];
                final name = params['name'];
                final description = params['description'];
                final gameRulesId = params['game_rules_id'];
                final imageUrl = params['image_url'];
                final backgroundImageUrl = params['background_image_url'];

                if (campaignId == null) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Missing campaign_id',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                await _connectionPool.query(
                  'UPDATE campaigns SET name = ?, description = ?, game_rules_id = ?, image_url = ?, background_image_url = ? WHERE id = ?',
                  [
                    name,
                    description,
                    gameRulesId,
                    imageUrl,
                    backgroundImageUrl,
                    campaignId,
                  ],
                );

                request.response.headers.contentType = ContentType.json;
                request.response.write(jsonEncode({'success': true}));
                await request.response.close();
              } catch (e) {
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': e.toString()}),
                );
                await request.response.close();
              }
            } else if ((request.uri.path == '/debug/users' ||
                    request.uri.path == '/api/debug/users') &&
                request.method == 'GET') {
              print('Received GET /debug/users request');
              try {
                var results = await _connectionPool.query(
                  'SELECT id, username FROM users',
                );
                print('Query executed, results: \$results');
                List<Map<String, dynamic>> users = [];
                for (var row in results) {
                  print('Row: \$row');
                  users.add({'id': row[0], 'username': row[1]});
                }
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'users': users}),
                );
                await request.response.close();
              } catch (e, stack) {
                print('Error in /debug/users: \$e');
                print(stack);
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': e.toString()}),
                );
                await request.response.close();
              }
            }
            // --- Serve static images ---
            else if (request.uri.path.startsWith('/images/') &&
                (request.method == 'GET' || request.method == 'HEAD')) {
              try {
                // Extract path: /images/campaign/user_id/campaign_id/filename or /images/tokens/user_id/campaign_id/filename
                final pathSegments = request.uri.pathSegments;

                // Handle TokenBorders directory (special case)
                if (pathSegments.length >= 3 &&
                    pathSegments[1] == 'TokenBorders') {
                  final filename = pathSegments.sublist(2).join('/');
                  final backendDir =
                      Directory.current.path.endsWith('backend')
                          ? Directory.current.path
                          : '${Directory.current.path}/backend';
                  final filePath = '$backendDir/images/TokenBorders/$filename';
                  final file = File(filePath);

                  if (await file.exists()) {
                    // Determine content type based on file extension
                    String contentType = 'application/octet-stream';
                    final extension = filename.toLowerCase().split('.').last;
                    switch (extension) {
                      case 'jpg':
                      case 'jpeg':
                        contentType = 'image/jpeg';
                        break;
                      case 'png':
                        contentType = 'image/png';
                        break;
                      case 'gif':
                        contentType = 'image/gif';
                        break;
                      case 'webp':
                        contentType = 'image/webp';
                        break;
                    }

                    request.response.headers.contentType = ContentType.parse(
                      contentType,
                    );
                    request.response.headers.add(
                      'Cache-Control',
                      'public, max-age=3600',
                    );

                    if (request.method == 'GET') {
                      final fileBytes = await file.readAsBytes();
                      request.response.add(fileBytes);
                    }
                    await request.response.close();
                  } else {
                    request.response.statusCode = HttpStatus.notFound;
                    await request.response.close();
                  }
                }
                // Handle campaign files (existing logic)
                else if (pathSegments.length >= 5) {
                  // Handle both old and new path structures
                  String filePath;
                  String filename;
                  if (pathSegments[1] == 'campaign' &&
                      pathSegments.length >= 6) {
                    // New structure: /images/campaign/category/userId/campaignId/filename
                    final category =
                        pathSegments[2]; // tokens, backgrounds, audio, props
                    final userId = pathSegments[3];
                    final campaignId = pathSegments[4];
                    filename = pathSegments.sublist(5).join('/');
                    filePath =
                        'images/campaign/$category/$userId/$campaignId/$filename';
                  } else {
                    // Old structure: /images/type/userId/campaignId/filename
                    final imageType = pathSegments[1];
                    final userId = pathSegments[2];
                    final campaignId = pathSegments[3];
                    filename = pathSegments.sublist(4).join('/');
                    filePath =
                        'images/$imageType/$userId/$campaignId/$filename';
                  }
                  final file = File(filePath);

                  if (await file.exists()) {
                    // Determine content type based on file extension
                    String contentType = 'application/octet-stream';
                    final extension = filename.toLowerCase().split('.').last;
                    switch (extension) {
                      case 'jpg':
                      case 'jpeg':
                        contentType = 'image/jpeg';
                        break;
                      case 'png':
                        contentType = 'image/png';
                        break;
                      case 'gif':
                        contentType = 'image/gif';
                        break;
                      case 'webp':
                        contentType = 'image/webp';
                        break;
                      case 'mp3':
                        contentType = 'audio/mpeg';
                        break;
                      case 'wav':
                        contentType = 'audio/wav';
                        break;
                      case 'ogg':
                        contentType = 'audio/ogg';
                        break;
                      case 'm4a':
                        contentType = 'audio/mp4';
                        break;
                      case 'aac':
                        contentType = 'audio/aac';
                        break;
                    }

                    request.response.headers.contentType = ContentType.parse(
                      contentType,
                    );
                    request.response.headers.add(
                      'Cache-Control',
                      'public, max-age=3600',
                    );

                    if (request.method == 'GET') {
                      final fileBytes = await file.readAsBytes();
                      request.response.add(fileBytes);
                    }
                    await request.response.close();
                  } else {
                    request.response.statusCode = HttpStatus.notFound;
                    await request.response.close();
                  }
                } else {
                  request.response.statusCode = HttpStatus.badRequest;
                  await request.response.close();
                }
              } catch (e) {
                print('Error serving image: $e');
                request.response.statusCode = HttpStatus.internalServerError;
                await request.response.close();
              }
            }
            // --- Map Layer Assets APIs ---
            // Map Tokens API
            else if (request.uri.path == '/api/map-tokens' &&
                request.method == 'GET') {
              String? mapId;
              try {
                print('GET /api/map-tokens - Request received');

                // Set CORS headers
                request.response.headers.set(
                  'Access-Control-Allow-Origin',
                  '*',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Methods',
                  'GET, POST, PUT, DELETE, OPTIONS',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Headers',
                  'Content-Type, Authorization',
                );
                request.response.headers.contentType = ContentType.json;

                mapId = request.uri.queryParameters['map_id'];
                if (mapId == null || mapId.isEmpty) {
                  print(
                    'GET /api/map-tokens - ERROR: Missing or empty map_id parameter',
                  );
                  request.response.statusCode = 400;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Missing or empty map_id parameter',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Validate map_id is numeric
                if (int.tryParse(mapId) == null) {
                  print(
                    'GET /api/map-tokens - ERROR: Invalid map_id format: $mapId',
                  );
                  request.response.statusCode = 400;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid map_id format. Must be numeric.',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                print('GET /api/map-tokens - Querying for map_id: $mapId');
                print(
                  'GET /api/map-tokens - About to execute database query...',
                );

                // Add timeout to database query
                var results = await _connectionPool
                    .query(
                      'SELECT id, map_id, asset_id, name, grid_x, grid_y, grid_z, scale_x, scale_y, rotation, visible, locked, properties, created_at, updated_at FROM map_tokens WHERE map_id = ?',
                      [mapId],
                    )
                    .timeout(
                      Duration(seconds: 30),
                      onTimeout: () {
                        throw TimeoutException(
                          'Database query timeout',
                          Duration(seconds: 30),
                        );
                      },
                    );

                print(
                  'GET /api/map-tokens - Database query completed successfully',
                );
                print(
                  'GET /api/map-tokens - Raw results count: ${results.length}',
                );
                List<Map<String, dynamic>> tokens = [];
                for (var row in results) {
                  var propertiesValue = row[12];
                  if (propertiesValue is String && propertiesValue.isNotEmpty) {
                    try {
                      propertiesValue = jsonDecode(propertiesValue);
                    } catch (e) {
                      propertiesValue = {};
                    }
                  } else {
                    propertiesValue = {};
                  }
                  tokens.add({
                    'id': row[0]?.toString() ?? '',
                    'map_id': row[1]?.toString() ?? '',
                    'asset_id': row[2]?.toString() ?? '',
                    'name': row[3]?.toString() ?? '',
                    'grid_x': int.tryParse(row[4]?.toString() ?? '0') ?? 0,
                    'grid_y': int.tryParse(row[5]?.toString() ?? '0') ?? 0,
                    'grid_z': int.tryParse(row[6]?.toString() ?? '0') ?? 0,
                    'scale_x': row[7]?.toString() ?? '1.0',
                    'scale_y': row[8]?.toString() ?? '1.0',
                    'rotation': row[9]?.toString() ?? '0.0',
                    'visible': row[10] == 1,
                    'locked': row[11] == 1,
                    'properties': propertiesValue,
                    'created_at': row[13]?.toString() ?? '',
                    'updated_at': row[14]?.toString() ?? '',
                  });
                }
                print('GET /api/map-tokens - Found ${tokens.length} tokens');
                // Logging removed to prevent file contention
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'tokens': tokens}),
                );
                await request.response.close();
              } catch (e, stack) {
                print(
                  'ERROR in GET /api/map-tokens for map_id=${mapId ?? 'unknown'}: $e',
                );
                print('ERROR Stack trace: $stack');
                print('ERROR Type: ${e.runtimeType}');
                // Logging removed to prevent file contention
                // Return empty but valid response when database is unavailable
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'tokens': []}),
                );
                await request.response.close();
              }
            } else if (request.uri.path == '/api/map-tokens' &&
                request.method == 'POST') {
              try {
                // Set CORS headers
                request.response.headers.set(
                  'Access-Control-Allow-Origin',
                  '*',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Methods',
                  'GET, POST, PUT, DELETE, OPTIONS',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Headers',
                  'Content-Type, Authorization',
                );
                request.response.headers.contentType = ContentType.json;

                print(
                  'POST /api/map-tokens - Request received at ${DateTime.now()}',
                );
                // Logging removed to prevent file contention

                // Read body with timeout
                final body = await utf8.decoder
                    .bind(request)
                    .join()
                    .timeout(
                      Duration(seconds: 10),
                      onTimeout:
                          () =>
                              throw TimeoutException(
                                'Request body read timeout',
                                Duration(seconds: 10),
                              ),
                    );

                print(
                  'POST /api/map-tokens - Body read successfully, length: ${body.length}',
                );
                // Logging removed to prevent file contention

                if (body.isEmpty) {
                  print('POST /api/map-tokens - ERROR: Empty request body');
                  request.response.statusCode = 400;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Request body cannot be empty',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                Map<String, dynamic> params;
                try {
                  params = jsonDecode(body) as Map<String, dynamic>;
                } catch (e) {
                  print('POST /api/map-tokens - ERROR: Invalid JSON: $e');
                  request.response.statusCode = 400;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid JSON format in request body',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                final mapId = params['map_id'];
                final assetId = params['asset_id'];
                // Support both grid_x/grid_y and x_position/y_position for compatibility
                final gridX = params['grid_x'] ?? params['x_position'];
                final gridY = params['grid_y'] ?? params['y_position'];

                print('POST /api/map-tokens - Received params: $params');

                // Validate required fields
                if (mapId == null ||
                    assetId == null ||
                    gridX == null ||
                    gridY == null) {
                  print(
                    'POST /api/map-tokens - ERROR: Missing required fields',
                  );
                  request.response.statusCode = 400;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error':
                          'Missing required fields: map_id, asset_id, and position (grid_x/grid_y or x_position/y_position)',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Validate field types
                if (int.tryParse(mapId.toString()) == null) {
                  print('POST /api/map-tokens - ERROR: Invalid map_id format');
                  request.response.statusCode = 400;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'map_id must be numeric',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                if (int.tryParse(assetId.toString()) == null) {
                  print(
                    'POST /api/map-tokens - ERROR: Invalid asset_id format',
                  );
                  request.response.statusCode = 400;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'asset_id must be numeric',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Execute database insert with timeout
                print(
                  'POST /api/map-tokens - Starting database insert at ${DateTime.now()}',
                );

                var result = await _connectionPool
                    .query(
                      'INSERT INTO map_tokens (map_id, asset_id, name, grid_x, grid_y, grid_z, scale_x, scale_y, rotation, visible, locked, properties) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                      [
                        mapId,
                        assetId,
                        params['name'] ?? '',
                        gridX,
                        gridY,
                        params['grid_z'] ?? 0,
                        params['scale_x'] ?? 1.0,
                        params['scale_y'] ?? 1.0,
                        params['rotation'] ?? 0.0,
                        params['visible'] ?? true,
                        params['locked'] ?? false,
                        jsonEncode(params['properties'] ?? {}),
                      ],
                    )
                    .timeout(
                      Duration(seconds: 30),
                      onTimeout: () {
                        throw TimeoutException(
                          'Database insert timeout',
                          Duration(seconds: 30),
                        );
                      },
                    );

                print(
                  'POST /api/map-tokens - Database insert completed at ${DateTime.now()}',
                );

                if (result.insertId == null) {
                  throw Exception(
                    'Failed to insert token - no insert ID returned',
                  );
                }

                // Logging removed to prevent file contention

                print(
                  'POST /api/map-tokens - Sending response at ${DateTime.now()}',
                );

                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'token_id': result.insertId}),
                );
                await request.response.close();

                print(
                  'POST /api/map-tokens - Response sent and closed at ${DateTime.now()}',
                );
              } catch (e, stack) {
                print('Error in POST /api/map-tokens: $e');
                print('Stack trace: $stack');
                // Removed _writeLog call to prevent deadlock
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': false, 'error': e.toString()}),
                );
                await request.response.close();
              }
            } else if (request.uri.path == '/api/map-tokens/batch' &&
                request.method == 'PUT') {
              // Batch update map tokens - New endpoint for handling multiple token updates
              try {
                // Set CORS headers
                request.response.headers.set(
                  'Access-Control-Allow-Origin',
                  '*',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Methods',
                  'GET, POST, PUT, DELETE, OPTIONS',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Headers',
                  'Content-Type, Authorization',
                );
                request.response.headers.contentType = ContentType.json;

                print(
                  '[PUT /api/map-tokens/batch] Request received at ${DateTime.now()}',
                );
                // Logging removed to prevent file contention

                // Read and parse request body
                String body;
                try {
                  body = await utf8.decoder
                      .bind(request)
                      .join()
                      .timeout(
                        Duration(seconds: 10),
                        onTimeout:
                            () =>
                                throw TimeoutException(
                                  'Request body read timeout',
                                  Duration(seconds: 10),
                                ),
                      );
                } catch (e) {
                  print(
                    '[PUT /api/map-tokens/batch] ERROR: Failed to read request body: $e',
                  );
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Failed to read request body',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                if (body.isEmpty) {
                  print(
                    '[PUT /api/map-tokens/batch] ERROR: Empty request body',
                  );
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Request body cannot be empty',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Parse JSON
                Map<String, dynamic> requestData;
                try {
                  requestData = jsonDecode(body) as Map<String, dynamic>;
                } catch (e) {
                  print(
                    '[PUT /api/map-tokens/batch] ERROR: Invalid JSON format: $e',
                  );
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid JSON format in request body',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Validate batch data structure
                if (!requestData.containsKey('tokens') ||
                    requestData['tokens'] is! List) {
                  print(
                    '[PUT /api/map-tokens/batch] ERROR: Invalid batch data structure',
                  );
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Request must contain a "tokens" array',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                final List<dynamic> tokens = requestData['tokens'];
                if (tokens.isEmpty) {
                  print(
                    '[PUT /api/map-tokens/batch] ERROR: Empty tokens array',
                  );
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Tokens array cannot be empty',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                if (tokens.length > 50) {
                  // Limit batch size to prevent abuse
                  print(
                    '[PUT /api/map-tokens/batch] ERROR: Batch size too large: ${tokens.length}',
                  );
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Batch size cannot exceed 50 tokens',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                print(
                  '[PUT /api/map-tokens/batch] Processing ${tokens.length} tokens',
                );

                // Process batch updates
                final List<Map<String, dynamic>> results = [];
                final List<String> errors = [];
                int successCount = 0;

                for (int i = 0; i < tokens.length; i++) {
                  final tokenData = tokens[i];

                  if (tokenData is! Map<String, dynamic>) {
                    errors.add('Token at index $i: Invalid token data format');
                    continue;
                  }

                  final tokenId = tokenData['id']?.toString();
                  if (tokenId == null || tokenId.isEmpty) {
                    errors.add('Token at index $i: Missing or empty token ID');
                    continue;
                  }

                  try {
                    // Build update query for this token
                    final List<String> updateFields = [];
                    final List<dynamic> updateValues = [];

                    // Define allowed fields for security
                    final allowedFields = {
                      'name': 'name',
                      'grid_x': 'grid_x',
                      'grid_y': 'grid_y',
                      'grid_z': 'grid_z',
                      'scale_x': 'scale_x',
                      'scale_y': 'scale_y',
                      'rotation': 'rotation',
                      'visible': 'visible',
                      'locked': 'locked',
                      'properties': 'properties',
                    };

                    for (final entry in allowedFields.entries) {
                      if (tokenData.containsKey(entry.key) &&
                          tokenData[entry.key] != null) {
                        updateFields.add('${entry.value} = ?');
                        if (entry.key == 'properties') {
                          updateValues.add(jsonEncode(tokenData[entry.key]));
                        } else {
                          updateValues.add(tokenData[entry.key]);
                        }
                      }
                    }

                    if (updateFields.isEmpty) {
                      errors.add('Token $tokenId: No valid fields to update');
                      continue;
                    }

                    // Add timestamp and token ID
                    updateFields.add('updated_at = CURRENT_TIMESTAMP');
                    updateValues.add(tokenId);

                    final query =
                        'UPDATE map_tokens SET ${updateFields.join(', ')} WHERE id = ?';

                    // Execute database update
                    final result = await _connectionPool.query(
                      query,
                      updateValues,
                    );

                    if (result.affectedRows == 0) {
                      errors.add(
                        'Token $tokenId: Not found or no changes made',
                      );
                    } else {
                      results.add({
                        'token_id': tokenId,
                        'updated_fields': updateFields.length - 1,
                        'success': true,
                      });
                      successCount++;
                    }
                  } catch (e) {
                    print(
                      '[PUT /api/map-tokens/batch] Error updating token $tokenId: $e',
                    );
                    errors.add(
                      'Token $tokenId: Database error - ${e.toString()}',
                    );
                  }
                }

                // Logging removed to prevent file contention

                // Send response
                request.response.statusCode = HttpStatus.ok;
                request.response.write(
                  jsonEncode({
                    'success': true,
                    'message': 'Batch update completed',
                    'total_tokens': tokens.length,
                    'successful_updates': successCount,
                    'failed_updates': errors.length,
                    'results': results,
                    'errors': errors,
                  }),
                );
                await request.response.close();
              } catch (e, stackTrace) {
                print('[PUT /api/map-tokens/batch] UNEXPECTED ERROR: $e');
                print('[PUT /api/map-tokens/batch] Stack trace: $stackTrace');
                // Logging removed to prevent file contention

                try {
                  request.response.statusCode = HttpStatus.internalServerError;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error':
                          'Internal server error occurred during batch update',
                    }),
                  );
                  await request.response.close();
                } catch (responseError) {
                  print(
                    '[PUT /api/map-tokens/batch] ERROR: Failed to send error response: $responseError',
                  );
                }
              }
            } else if (request.uri.path.startsWith('/api/map-tokens/') &&
                request.method == 'PUT') {
              // Update map token - Completely rewritten for better error handling
              String? tokenId;
              try {
                // Set CORS headers first
                request.response.headers.set(
                  'Access-Control-Allow-Origin',
                  '*',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Methods',
                  'GET, POST, PUT, DELETE, OPTIONS',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Headers',
                  'Content-Type, Authorization',
                );
                request.response.headers.contentType = ContentType.json;

                print(
                  '[PUT /api/map-tokens] Request received at ${DateTime.now()}',
                );

                // Extract token ID from path
                final pathParts = request.uri.path.split('/');
                if (pathParts.length < 4) {
                  print('[PUT /api/map-tokens] ERROR: Invalid path format');
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error':
                          'Invalid path format. Expected /api/map-tokens/{id}',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                tokenId = pathParts[3];
                if (tokenId.isEmpty) {
                  print('[PUT /api/map-tokens] ERROR: Empty token ID');
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Token ID cannot be empty',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                print('[PUT /api/map-tokens] Processing token ID: $tokenId');

                // Read and parse request body
                String body;
                try {
                  body = await utf8.decoder.bind(request).join();
                  print('[PUT /api/map-tokens] Request body received: $body');
                } catch (e) {
                  print(
                    '[PUT /api/map-tokens] ERROR: Failed to read request body: $e',
                  );
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Failed to read request body',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                if (body.isEmpty) {
                  print('[PUT /api/map-tokens] ERROR: Empty request body');
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Request body cannot be empty',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Parse JSON
                Map<String, dynamic> params;
                try {
                  params = jsonDecode(body) as Map<String, dynamic>;
                  print('[PUT /api/map-tokens] Parsed parameters: $params');
                } catch (e) {
                  print('[PUT /api/map-tokens] ERROR: Invalid JSON format: $e');
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid JSON format in request body',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Build update query dynamically
                final List<String> updateFields = [];
                final List<dynamic> updateValues = [];

                // Define allowed fields for security
                final allowedFields = {
                  'name': 'name',
                  'grid_x': 'grid_x',
                  'grid_y': 'grid_y',
                  'grid_z': 'grid_z',
                  'scale_x': 'scale_x',
                  'scale_y': 'scale_y',
                  'rotation': 'rotation',
                  'visible': 'visible',
                  'locked': 'locked',
                  'properties': 'properties',
                };

                // Handle coordinate parameters - support both formats for compatibility
                if (params.containsKey('x_position') && params['x_position'] != null) {
                  updateFields.add('grid_x = ?');
                  updateValues.add(params['x_position']);
                }
                if (params.containsKey('y_position') && params['y_position'] != null) {
                  updateFields.add('grid_y = ?');
                  updateValues.add(params['y_position']);
                }

                for (final entry in allowedFields.entries) {
                  if (params.containsKey(entry.key) &&
                      params[entry.key] != null) {
                    updateFields.add('${entry.value} = ?');
                    if (entry.key == 'properties') {
                      updateValues.add(jsonEncode(params[entry.key]));
                    } else {
                      updateValues.add(params[entry.key]);
                    }
                  }
                }

                if (updateFields.isEmpty) {
                  print(
                    '[PUT /api/map-tokens] ERROR: No valid fields to update',
                  );
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'No valid fields provided for update',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Add timestamp and token ID
                updateFields.add('updated_at = CURRENT_TIMESTAMP');
                updateValues.add(tokenId);

                final query =
                    'UPDATE map_tokens SET ${updateFields.join(', ')} WHERE id = ?';
                print('[PUT /api/map-tokens] Executing query: $query');
                print('[PUT /api/map-tokens] Query values: $updateValues');

                // Execute database update
                try {
                  final result = await _connectionPool.query(
                    query,
                    updateValues,
                  );
                  print(
                    '[PUT /api/map-tokens] Database query executed successfully',
                  );
                  print(
                    '[PUT /api/map-tokens] Affected rows: ${result.affectedRows}',
                  );

                  if (result.affectedRows == 0) {
                    print(
                      '[PUT /api/map-tokens] WARNING: No rows affected - token may not exist',
                    );
                    request.response.statusCode = HttpStatus.notFound;
                    request.response.write(
                      jsonEncode({
                        'success': false,
                        'error': 'Token not found or no changes made',
                      }),
                    );
                    await request.response.close();
                    return;
                  }

                  // Logging removed to prevent file contention

                  // Success response
                  request.response.statusCode = HttpStatus.ok;
                  request.response.write(
                    jsonEncode({
                      'success': true,
                      'message': 'Token updated successfully',
                      'token_id': tokenId,
                      'updated_fields': updateFields.length - 1,
                    }),
                  );
                  await request.response.close();
                } catch (dbError) {
                  print('[PUT /api/map-tokens] DATABASE ERROR: $dbError');
                  // Logging removed to prevent file contention
                  request.response.statusCode = HttpStatus.internalServerError;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Database operation failed',
                    }),
                  );
                  await request.response.close();
                  return;
                }
              } catch (e, stackTrace) {
                print('[PUT /api/map-tokens] UNEXPECTED ERROR: $e');
                print('[PUT /api/map-tokens] Stack trace: $stackTrace');
                // Logging removed to prevent file contention

                try {
                  request.response.statusCode = HttpStatus.internalServerError;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Internal server error occurred',
                    }),
                  );
                  await request.response.close();
                } catch (responseError) {
                  print(
                    '[PUT /api/map-tokens] ERROR: Failed to send error response: $responseError',
                  );
                }
              }
            }
            // Tokens API (alias for map-tokens for frontend compatibility)
            else if (request.uri.path == '/api/tokens' &&
                request.method == 'GET') {
              String? mapId;
              try {
                print('GET /api/tokens - Request received');

                // Set CORS headers
                request.response.headers.set(
                  'Access-Control-Allow-Origin',
                  '*',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Methods',
                  'GET, POST, PUT, DELETE, OPTIONS',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Headers',
                  'Content-Type, Authorization',
                );
                request.response.headers.contentType = ContentType.json;

                mapId = request.uri.queryParameters['map_id'];
                if (mapId == null || mapId.isEmpty) {
                  print(
                    'GET /api/tokens - ERROR: Missing or empty map_id parameter',
                  );
                  request.response.statusCode = 400;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Missing or empty map_id parameter',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Validate map_id is numeric
                if (int.tryParse(mapId) == null) {
                  print(
                    'GET /api/tokens - ERROR: Invalid map_id format: $mapId',
                  );
                  request.response.statusCode = 400;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid map_id format. Must be numeric.',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                print('GET /api/tokens - Querying for map_id: $mapId');

                // Add timeout to database query
                var results = await _connectionPool
                    .query(
                      'SELECT id, map_id, asset_id, name, grid_x, grid_y, grid_z, scale_x, scale_y, rotation, visible, locked, properties, created_at, updated_at FROM map_tokens WHERE map_id = ?',
                      [mapId],
                    )
                    .timeout(
                      Duration(seconds: 30),
                      onTimeout: () {
                        throw TimeoutException(
                          'Database query timeout',
                          Duration(seconds: 30),
                        );
                      },
                    );

                List<Map<String, dynamic>> tokens = [];
                for (var row in results) {
                  // Handle properties field that might be a Blob
                  String? propertiesStr;
                  if (row['properties'] != null) {
                    if (row['properties'] is String) {
                      propertiesStr = row['properties'];
                    } else {
                      // Convert Blob to string if needed
                      propertiesStr = row['properties'].toString();
                    }
                  }
                  
                  tokens.add({
                    'id': row['id'],
                    'map_id': row['map_id'],
                    'asset_id': row['asset_id'],
                    'name': row['name'],
                    'grid_x': row['grid_x'],
                    'grid_y': row['grid_y'],
                    'grid_z': row['grid_z'],
                    'scale_x': row['scale_x'],
                    'scale_y': row['scale_y'],
                    'rotation': row['rotation'],
                    'visible': row['visible'],
                    'locked': row['locked'],
                    'properties': propertiesStr,
                    'created_at': row['created_at']?.toString(),
                    'updated_at': row['updated_at']?.toString(),
                  });
                }

                print('GET /api/tokens - Found ${tokens.length} tokens');
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'tokens': tokens}),
                );
                await request.response.close();
              } catch (e) {
                print(
                  'ERROR in GET /api/tokens for map_id=${mapId ?? 'unknown'}: $e',
                );
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'tokens': []}),
                );
                await request.response.close();
              }
            // POST /api/tokens endpoint removed - use POST /api/map-tokens instead
            } else if (request.uri.path.startsWith('/api/tokens/') &&
                request.method == 'PUT') {
              try {
                // Set CORS headers
                request.response.headers.set(
                  'Access-Control-Allow-Origin',
                  '*',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Methods',
                  'GET, POST, PUT, DELETE, OPTIONS',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Headers',
                  'Content-Type, Authorization',
                );
                request.response.headers.contentType = ContentType.json;

                // Extract token ID from path
                final pathParts = request.uri.path.split('/');
                if (pathParts.length < 4) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid path format. Expected /api/tokens/{id}',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                final tokenId = pathParts[3];
                if (tokenId.isEmpty) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Token ID cannot be empty',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Read request body
                final body = await utf8.decoder.bind(request).join();
                final params = jsonDecode(body) as Map<String, dynamic>;

                // Build update query dynamically
                List<String> updateFields = [];
                List<dynamic> updateValues = [];

                if (params.containsKey('grid_x')) {
                  updateFields.add('grid_x = ?');
                  updateValues.add(params['grid_x']);
                }
                if (params.containsKey('grid_y')) {
                  updateFields.add('grid_y = ?');
                  updateValues.add(params['grid_y']);
                }
                if (params.containsKey('name')) {
                  updateFields.add('name = ?');
                  updateValues.add(params['name']);
                }
                if (params.containsKey('visible')) {
                  updateFields.add('visible = ?');
                  updateValues.add(params['visible']);
                }
                if (params.containsKey('locked')) {
                  updateFields.add('locked = ?');
                  updateValues.add(params['locked']);
                }

                if (updateFields.isEmpty) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'No valid fields provided for update',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Add timestamp and token ID
                updateFields.add('updated_at = CURRENT_TIMESTAMP');
                updateValues.add(tokenId);

                final query =
                    'UPDATE map_tokens SET ${updateFields.join(', ')} WHERE id = ?';

                // Execute database update
                var result = await _connectionPool.query(query, updateValues);

                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': true,
                    'affected_rows': result.affectedRows,
                  }),
                );
                await request.response.close();
              } catch (e) {
                print('Error in PUT /api/tokens: $e');
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Internal server error occurred',
                  }),
                );
                await request.response.close();
              }
            } else if (request.uri.path.startsWith('/api/tokens/') &&
                request.method == 'DELETE') {
              try {
                // Set CORS headers
                request.response.headers.set(
                  'Access-Control-Allow-Origin',
                  '*',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Methods',
                  'GET, POST, PUT, DELETE, OPTIONS',
                );
                request.response.headers.set(
                  'Access-Control-Allow-Headers',
                  'Content-Type, Authorization',
                );
                request.response.headers.contentType = ContentType.json;

                // Extract token ID from path
                final pathParts = request.uri.path.split('/');
                if (pathParts.length < 4) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid path format. Expected /api/tokens/{id}',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                final tokenId = pathParts[3];
                if (tokenId.isEmpty) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Token ID cannot be empty',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Delete from database
                var result = await _connectionPool.query(
                  'DELETE FROM map_tokens WHERE id = ?',
                  [tokenId],
                );

                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': true,
                    'affected_rows': result.affectedRows,
                  }),
                );
                await request.response.close();
              } catch (e) {
                print('Error in DELETE /api/tokens: $e');
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Internal server error occurred',
                  }),
                );
                await request.response.close();
              }
            }
            // Map Backgrounds API
            else if (request.uri.path == '/api/map-backgrounds' &&
                request.method == 'GET') {
              String? mapId;
              try {
                print('GET /api/map-backgrounds - Request received');
                mapId = request.uri.queryParameters['map_id'];
                if (mapId == null) {
                  print(
                    'GET /api/map-backgrounds - ERROR: Missing map_id parameter',
                  );
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'Missing map_id'}),
                  );
                  await request.response.close();
                  return;
                }

                print('GET /api/map-backgrounds - Querying for map_id: $mapId');
                print(
                  'GET /api/map-backgrounds - About to execute database query...',
                );
                var results = await _connectionPool.query(
                  'SELECT id, map_id, asset_id, grid_x, grid_y, grid_z, grid_width, grid_height, scale_x, scale_y, rotation, visible, locked, properties, created_at, updated_at FROM map_backgrounds WHERE map_id = ?',
                  [mapId],
                );
                print(
                  'GET /api/map-backgrounds - Database query completed successfully',
                );
                print(
                  'GET /api/map-backgrounds - Raw results count: ${results.length}',
                );
                List<Map<String, dynamic>> backgrounds = [];
                for (var row in results) {
                  var propertiesValue = row[13];
                  if (propertiesValue is String && propertiesValue.isNotEmpty) {
                    try {
                      propertiesValue = jsonDecode(propertiesValue);
                    } catch (e) {
                      propertiesValue = {};
                    }
                  } else {
                    propertiesValue = {};
                  }
                  backgrounds.add({
                    'id': row[0]?.toString() ?? '',
                    'map_id': row[1]?.toString() ?? '',
                    'asset_id': row[2]?.toString() ?? '',
                    'grid_x': int.tryParse(row[3]?.toString() ?? '0') ?? 0,
                    'grid_y': int.tryParse(row[4]?.toString() ?? '0') ?? 0,
                    'grid_z': int.tryParse(row[5]?.toString() ?? '0') ?? 0,
                    'grid_width': int.tryParse(row[6]?.toString() ?? '1') ?? 1,
                    'grid_height': int.tryParse(row[7]?.toString() ?? '1') ?? 1,
                    'scale_x': row[8]?.toString() ?? '1.0',
                    'scale_y': row[9]?.toString() ?? '1.0',
                    'rotation': row[10]?.toString() ?? '0.0',
                    'visible': row[11] == 1,
                    'locked': row[12] == 1,
                    'properties': propertiesValue,
                    'created_at': row[14]?.toString() ?? '',
                    'updated_at': row[15]?.toString() ?? '',
                  });
                }
                print(
                  'GET /api/map-backgrounds - Found ${backgrounds.length} backgrounds',
                );
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'backgrounds': backgrounds}),
                );
                await request.response.close();
              } catch (e, stack) {
                print(
                  'ERROR in GET /api/map-backgrounds for map_id=${mapId ?? 'unknown'}: $e',
                );
                print('ERROR Stack trace: $stack');
                print('ERROR Type: ${e.runtimeType}');
                // Return empty but valid response when database is unavailable
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'backgrounds': []}),
                );
                await request.response.close();
              }
            } else if (request.uri.path == '/api/map-backgrounds' &&
                request.method == 'POST') {
              final body = await utf8.decoder.bind(request).join();
              final params = jsonDecode(body);
              final mapId = params['map_id'];
              final assetId = params['asset_id'];
              final gridX = params['grid_x'];
              final gridY = params['grid_y'];

              if (mapId == null ||
                  assetId == null ||
                  gridX == null ||
                  gridY == null) {
                request.response.statusCode = 400;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing required fields',
                  }),
                );
                await request.response.close();
                return;
              }

              var result = await _connectionPool.query(
                'INSERT INTO map_backgrounds (map_id, asset_id, grid_x, grid_y, grid_z, grid_width, grid_height, scale_x, scale_y, rotation, visible, locked, properties) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  mapId,
                  assetId,
                  gridX,
                  gridY,
                  params['grid_z'] ?? 0,
                  params['grid_width'] ?? 1,
                  params['grid_height'] ?? 1,
                  params['scale_x'] ?? 1.0,
                  params['scale_y'] ?? 1.0,
                  params['rotation'] ?? 0.0,
                  params['visible'] ?? true,
                  params['locked'] ?? false,
                  jsonEncode(params['properties'] ?? {}),
                ],
              );

              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'success': true, 'background_id': result.insertId}),
              );
              await request.response.close();
            }
            // Map Audio API
            else if (request.uri.path == '/api/map-audio' &&
                request.method == 'GET') {
              String? mapId;
              try {
                print('GET /api/map-audio - Request received');
                mapId = request.uri.queryParameters['map_id'];
                if (mapId == null) {
                  print('GET /api/map-audio - ERROR: Missing map_id parameter');
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'Missing map_id'}),
                  );
                  await request.response.close();
                  return;
                }

                print('GET /api/map-audio - Querying for map_id: $mapId');
                print(
                  'GET /api/map-audio - About to execute database query...',
                );
                var results = await _connectionPool.query(
                  'SELECT id, map_id, asset_id, name, grid_x, grid_y, volume, loop_audio, auto_play, radius_grid, grid_z, visible, locked, properties, created_at, updated_at FROM map_audio WHERE map_id = ?',
                  [mapId],
                );
                print(
                  'GET /api/map-audio - Database query completed successfully',
                );
                print(
                  'GET /api/map-audio - Raw results count: ${results.length}',
                );
                List<Map<String, dynamic>> audioItems = [];
                for (var row in results) {
                  var propertiesValue = row[13];
                  if (propertiesValue is String && propertiesValue.isNotEmpty) {
                    try {
                      propertiesValue = jsonDecode(propertiesValue);
                    } catch (e) {
                      propertiesValue = {};
                    }
                  } else {
                    propertiesValue = {};
                  }
                  audioItems.add({
                    'id': row[0]?.toString() ?? '',
                    'map_id': row[1]?.toString() ?? '',
                    'asset_id': row[2]?.toString() ?? '',
                    'name': row[3]?.toString() ?? '',
                    'grid_x': int.tryParse(row[4]?.toString() ?? '0') ?? 0,
                    'grid_y': int.tryParse(row[5]?.toString() ?? '0') ?? 0,
                    'volume': row[6]?.toString() ?? '1.0',
                    'loop_audio': row[7] == 1,
                    'auto_play': row[8] == 1,
                    'radius_grid': int.tryParse(row[9]?.toString() ?? '0') ?? 0,
                    'grid_z': int.tryParse(row[10]?.toString() ?? '0') ?? 0,
                    'visible': row[11] == 1,
                    'locked': row[12] == 1,
                    'properties': propertiesValue,
                    'created_at': row[14]?.toString() ?? '',
                    'updated_at': row[15]?.toString() ?? '',
                  });
                }
                print(
                  'GET /api/map-audio - Found ${audioItems.length} audio items',
                );
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'audio': audioItems}),
                );
                await request.response.close();
              } catch (e, stack) {
                print(
                  'ERROR in GET /api/map-audio for map_id=${mapId ?? 'unknown'}: $e',
                );
                print('ERROR Stack trace: $stack');
                print('ERROR Type: ${e.runtimeType}');
                // Return empty but valid response when database is unavailable
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'audio': []}),
                );
                await request.response.close();
              }
            } else if (request.uri.path == '/api/map-audio' &&
                request.method == 'POST') {
              final body = await utf8.decoder.bind(request).join();
              final params = jsonDecode(body);
              final mapId = params['map_id'];
              final assetId = params['asset_id'];
              final gridX = params['grid_x'];
              final gridY = params['grid_y'];

              if (mapId == null ||
                  assetId == null ||
                  gridX == null ||
                  gridY == null) {
                request.response.statusCode = 400;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing required fields',
                  }),
                );
                await request.response.close();
                return;
              }

              var result = await _connectionPool.query(
                'INSERT INTO map_audio (map_id, asset_id, grid_x, grid_y, grid_z, volume, loop_audio, auto_play, radius_grid, visible, locked, properties) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  mapId,
                  assetId,
                  gridX,
                  gridY,
                  params['grid_z'] ?? 0,
                  params['volume'] ?? 1.0,
                  params['loop_audio'] ?? false,
                  params['auto_play'] ?? false,
                  params['radius_grid'] ?? 0,
                  params['visible'] ?? true,
                  params['locked'] ?? false,
                  jsonEncode(params['properties'] ?? {}),
                ],
              );

              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'success': true, 'audio_id': result.insertId}),
              );
              await request.response.close();
            }
            // Map Props API
            else if (request.uri.path == '/api/map-props' &&
                request.method == 'GET') {
              String? mapId;
              try {
                print('GET /api/map-props - Request received');
                mapId = request.uri.queryParameters['map_id'];
                if (mapId == null) {
                  print('GET /api/map-props - ERROR: Missing map_id parameter');
                  request.response.statusCode = 400;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({'success': false, 'error': 'Missing map_id'}),
                  );
                  await request.response.close();
                  return;
                }

                print('GET /api/map-props - Querying for map_id: $mapId');
                print(
                  'GET /api/map-props - About to execute database query...',
                );
                var results = await _connectionPool.query(
                  'SELECT id, map_id, asset_id, grid_x, grid_y, grid_z, grid_width, grid_height, scale_x, scale_y, rotation, visible, locked, properties, created_at, updated_at FROM map_props WHERE map_id = ?',
                  [mapId],
                );
                print(
                  'GET /api/map-props - Database query completed successfully',
                );
                print(
                  'GET /api/map-props - Raw results count: ${results.length}',
                );
                List<Map<String, dynamic>> props = [];
                for (var row in results) {
                  var propertiesValue = row[13];
                  if (propertiesValue is String && propertiesValue.isNotEmpty) {
                    try {
                      propertiesValue = jsonDecode(propertiesValue);
                    } catch (e) {
                      propertiesValue = {};
                    }
                  } else {
                    propertiesValue = {};
                  }
                  props.add({
                    'id': row[0]?.toString() ?? '',
                    'map_id': row[1]?.toString() ?? '',
                    'asset_id': row[2]?.toString() ?? '',
                    'grid_x': int.tryParse(row[3]?.toString() ?? '0') ?? 0,
                    'grid_y': int.tryParse(row[4]?.toString() ?? '0') ?? 0,
                    'grid_z': int.tryParse(row[5]?.toString() ?? '0') ?? 0,
                    'grid_width': int.tryParse(row[6]?.toString() ?? '1') ?? 1,
                    'grid_height': int.tryParse(row[7]?.toString() ?? '1') ?? 1,
                    'scale_x': row[8]?.toString() ?? '1.0',
                    'scale_y': row[9]?.toString() ?? '1.0',
                    'rotation': row[10]?.toString() ?? '0.0',
                    'visible': row[11] == 1,
                    'locked': row[12] == 1,
                    'properties': propertiesValue,
                    'created_at': row[14]?.toString() ?? '',
                    'updated_at': row[15]?.toString() ?? '',
                  });
                }
                print('GET /api/map-props - Found ${props.length} props');
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'props': props}),
                );
                await request.response.close();
              } catch (e, stack) {
                print(
                  'ERROR in GET /api/map-props for map_id=${mapId ?? 'unknown'}: $e',
                );
                print('ERROR Stack trace: $stack');
                print('ERROR Type: ${e.runtimeType}');
                // Return empty but valid response when database is unavailable
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'props': []}),
                );
                await request.response.close();
              }
            } else if (request.uri.path == '/api/map-props' &&
                request.method == 'POST') {
              final body = await utf8.decoder.bind(request).join();
              final params = jsonDecode(body);
              final mapId = params['map_id'];
              final assetId = params['asset_id'];
              final gridX = params['grid_x'];
              final gridY = params['grid_y'];

              if (mapId == null ||
                  assetId == null ||
                  gridX == null ||
                  gridY == null) {
                request.response.statusCode = 400;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Missing required fields',
                  }),
                );
                await request.response.close();
                return;
              }

              var result = await _connectionPool.query(
                'INSERT INTO map_props (map_id, asset_id, grid_x, grid_y, grid_z, grid_width, grid_height, scale_x, scale_y, rotation, visible, locked, properties) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  mapId,
                  assetId,
                  gridX,
                  gridY,
                  params['grid_z'] ?? 0,
                  params['grid_width'] ?? 1,
                  params['grid_height'] ?? 1,
                  params['scale_x'] ?? 1.0,
                  params['scale_y'] ?? 1.0,
                  params['rotation'] ?? 0.0,
                  params['visible'] ?? true,
                  params['locked'] ?? false,
                  jsonEncode(params['properties'] ?? {}),
                ],
              );

              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'success': true, 'prop_id': result.insertId}),
              );
              await request.response.close();
            }
            // --- API for token borders ---
            else if (request.uri.path == '/api/token-borders' &&
                request.method == 'GET') {
              try {
                print('GET /api/token-borders - Request received');

                // Get the backend directory path
                final backendDir =
                    Directory.current.path.endsWith('backend')
                        ? Directory.current.path
                        : '${Directory.current.path}${Platform.pathSeparator}backend';

                final tokenBordersDir = Directory(
                  '$backendDir${Platform.pathSeparator}images${Platform.pathSeparator}TokenBorders',
                );

                print(
                  'GET /api/token-borders - Looking for directory: ${tokenBordersDir.path}',
                );
                print(
                  'GET /api/token-borders - Current directory: ${Directory.current.path}',
                );

                if (!await tokenBordersDir.exists()) {
                  print(
                    'GET /api/token-borders - TokenBorders directory not found',
                  );
                  request.response.statusCode = HttpStatus.notFound;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Token borders directory not found',
                      'borders': [],
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // List all PNG, JPG, JPEG files in the directory
                final files =
                    await tokenBordersDir
                        .list()
                        .where((entity) {
                          if (entity is File) {
                            final fileName =
                                entity.path
                                    .split(Platform.pathSeparator)
                                    .last
                                    .toLowerCase();
                            return fileName.endsWith('.png') ||
                                fileName.endsWith('.jpg') ||
                                fileName.endsWith('.jpeg');
                          }
                          return false;
                        })
                        .map((entity) {
                          final fileName =
                              entity.path.split(Platform.pathSeparator).last;
                          return {
                            'name': fileName,
                            'url': '/images/TokenBorders/$fileName',
                          };
                        })
                        .toList();

                print(
                  'GET /api/token-borders - Found ${files.length} token border files',
                );

                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({'success': true, 'borders': files}),
                );
                await request.response.close();
              } catch (e, stack) {
                print('ERROR in GET /api/token-borders: $e');
                print('Stack trace: $stack');
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Failed to fetch token borders: ${e.toString()}',
                    'borders': [],
                  }),
                );
                await request.response.close();
              }
            }
            // --- API for file upload ---
            else if ((request.uri.path == '/upload' ||
                    request.uri.path == '/api/upload') &&
                request.method == 'POST') {
              try {
                print('POST /api/upload - Upload request received');

                // Set timeout for the entire upload process
                final uploadTimeout = Duration(minutes: 5);

                // Parse multipart form data
                final contentType = request.headers.contentType;
                if (contentType?.mimeType != 'multipart/form-data') {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Content-Type must be multipart/form-data',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                final boundary = contentType!.parameters['boundary'];
                if (boundary == null) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Missing boundary in Content-Type',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Check Content-Length header for file size validation
                final contentLength = request.headers.contentLength;
                const maxFileSize = 50 * 1024 * 1024; // 50MB
                if (contentLength > maxFileSize) {
                  request.response.statusCode =
                      HttpStatus.requestEntityTooLarge;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'File too large. Maximum size is 50MB',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Read request body as bytes
                final bytes = await request.fold<List<int>>(
                  <int>[],
                  (previous, element) => previous..addAll(element),
                );

                // Parse multipart data from bytes
                final boundaryBytes = utf8.encode('--$boundary');
                String? userId, campaignId, uploadType, filename;
                List<int>? fileBytes;

                // Find parts by boundary
                final parts = <List<int>>[];
                int start = 0;
                while (start < bytes.length) {
                  int boundaryIndex = -1;
                  for (
                    int i = start;
                    i <= bytes.length - boundaryBytes.length;
                    i++
                  ) {
                    bool match = true;
                    for (int j = 0; j < boundaryBytes.length; j++) {
                      if (bytes[i + j] != boundaryBytes[j]) {
                        match = false;
                        break;
                      }
                    }
                    if (match) {
                      boundaryIndex = i;
                      break;
                    }
                  }

                  if (boundaryIndex == -1) break;

                  if (start < boundaryIndex) {
                    parts.add(bytes.sublist(start, boundaryIndex));
                  }
                  start = boundaryIndex + boundaryBytes.length;
                }

                for (final partBytes in parts) {
                  if (partBytes.length < 10) continue;

                  // Convert headers part to string to parse
                  final headerEndIndex = _findHeaderEnd(partBytes);
                  if (headerEndIndex == -1) continue;

                  final headerBytes = partBytes.sublist(0, headerEndIndex);
                  final headerString = utf8.decode(
                    headerBytes,
                    allowMalformed: true,
                  );

                  if (headerString.contains('name="user_id"')) {
                    final valueBytes = partBytes.sublist(
                      headerEndIndex + 4,
                    ); // Skip \r\n\r\n
                    userId =
                        utf8.decode(valueBytes, allowMalformed: true).trim();
                  } else if (headerString.contains('name="campaign_id"')) {
                    final valueBytes = partBytes.sublist(headerEndIndex + 4);
                    campaignId =
                        utf8.decode(valueBytes, allowMalformed: true).trim();
                  } else if (headerString.contains('name="upload_type"')) {
                    final valueBytes = partBytes.sublist(headerEndIndex + 4);
                    uploadType =
                        utf8.decode(valueBytes, allowMalformed: true).trim();
                  } else if (headerString.contains('name="file"')) {
                    // Extract filename
                    final filenameMatch = RegExp(
                      r'filename="([^"]+)"',
                    ).firstMatch(headerString);
                    if (filenameMatch != null) {
                      filename = filenameMatch.group(1);
                    }

                    // File content is after headers
                    fileBytes = partBytes.sublist(headerEndIndex + 4);
                  }
                }

                print(
                  'POST /api/upload - Parsed fields: userId=$userId, campaignId=$campaignId, filename=$filename, fileBytes=${fileBytes?.length}',
                );

                if (userId == null ||
                    userId.trim().isEmpty ||
                    campaignId == null ||
                    campaignId.trim().isEmpty ||
                    filename == null ||
                    filename.trim().isEmpty ||
                    fileBytes == null) {
                  print('POST /api/upload - Missing required fields');
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error':
                          'Missing required fields: user_id, campaign_id, file',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Validate user_id and campaign_id format
                if (int.tryParse(userId) == null ||
                    int.tryParse(campaignId) == null) {
                  request.response.statusCode = HttpStatus.badRequest;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Invalid user_id or campaign_id format',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Validate file size
                if (fileBytes.length > maxFileSize) {
                  request.response.statusCode =
                      HttpStatus.requestEntityTooLarge;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'File too large. Maximum size is 50MB',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Validate filename and file extension
                final allowedExtensions = {
                  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', // Images
                  'mp3', 'wav', 'ogg', 'mp4', 'webm', // Audio/Video
                  'pdf', 'txt', 'json', // Documents
                };

                final fileExtension = filename.split('.').last.toLowerCase();
                if (!allowedExtensions.contains(fileExtension)) {
                  request.response.statusCode = HttpStatus.unsupportedMediaType;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error':
                          'Unsupported file type. Allowed: ${allowedExtensions.join(', ')}',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Sanitize filename to prevent path traversal
                final sanitizedFilename = filename.replaceAll(
                  RegExp(r'[^a-zA-Z0-9._-]'),
                  '_',
                );
                if (sanitizedFilename != filename) {
                  print(
                    'POST /api/upload - Filename sanitized: $filename -> $sanitizedFilename',
                  );
                }

                // Determine upload directory based on upload_type - using generic campaign folders
                String baseDir;
                switch (uploadType?.toLowerCase()) {
                  case 'background':
                  case 'campaign':
                    baseDir = 'images/campaign';
                    break;
                  case 'tokens':
                  case 'token':
                    baseDir = 'images/campaign/tokens';
                    break;
                  case 'props':
                    baseDir = 'images/campaign/props';
                    break;
                  case 'audio':
                    baseDir = 'images/campaign/audio';
                    break;
                  case 'backgrounds':
                    baseDir = 'images/campaign/backgrounds';
                    break;
                  default:
                    baseDir = 'images/campaign/tokens'; // Default fallback
                    break;
                }

                // Get the backend directory path
                final backendDir =
                    Directory.current.path.endsWith('backend')
                        ? Directory.current.path
                        : '${Directory.current.path}/backend';

                // Create directory structure: backend/baseDir/user_id/campaign_id/
                final uploadDir = Directory(
                  '$backendDir/$baseDir/$userId/$campaignId',
                );
                if (!await uploadDir.exists()) {
                  await uploadDir.create(recursive: true);
                }

                // Generate unique filename to avoid conflicts
                final timestamp = DateTime.now().millisecondsSinceEpoch;
                final uniqueFilename = '${timestamp}_$sanitizedFilename';
                final filePath = '${uploadDir.path}/$uniqueFilename';

                // Write file with timeout
                final file = File(filePath);
                await file.writeAsBytes(fileBytes).timeout(uploadTimeout);

                // Verify file was written correctly
                if (!await file.exists()) {
                  request.response.statusCode = HttpStatus.internalServerError;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'Failed to save file',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                final actualFileSize = await file.length();
                if (actualFileSize != fileBytes.length) {
                  // Clean up incomplete file
                  await file.delete();
                  request.response.statusCode = HttpStatus.internalServerError;
                  request.response.headers.contentType = ContentType.json;
                  request.response.write(
                    jsonEncode({
                      'success': false,
                      'error': 'File upload incomplete',
                    }),
                  );
                  await request.response.close();
                  return;
                }

                // Generate URL for frontend - using generic campaign structure
                String urlPath;
                switch (uploadType?.toLowerCase()) {
                  case 'background':
                  case 'campaign':
                    urlPath =
                        '/images/campaign/$userId/$campaignId/$uniqueFilename';
                    break;
                  case 'tokens':
                  case 'token':
                    urlPath =
                        '/images/campaign/tokens/$userId/$campaignId/$uniqueFilename';
                    break;
                  case 'props':
                    urlPath =
                        '/images/campaign/props/$userId/$campaignId/$uniqueFilename';
                    break;
                  case 'audio':
                    urlPath =
                        '/images/campaign/audio/$userId/$campaignId/$uniqueFilename';
                    break;
                  case 'backgrounds':
                    urlPath =
                        '/images/campaign/backgrounds/$userId/$campaignId/$uniqueFilename';
                    break;
                  default:
                    urlPath =
                        '/images/campaign/tokens/$userId/$campaignId/$uniqueFilename';
                    break;
                }
                final fileUrl = urlPath;

                print(
                  'POST /api/upload - File uploaded successfully: $fileUrl',
                );
                print('POST /api/upload - Original filename: $filename');
                print(
                  'POST /api/upload - Sanitized filename: $sanitizedFilename',
                );
                print(
                  'POST /api/upload - Final unique filename: $uniqueFilename',
                );

                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': true,
                    'url': fileUrl,
                    'filename': uniqueFilename,
                    'original_filename': filename,
                    'size': actualFileSize,
                    'upload_type': uploadType ?? 'token',
                  }),
                );
                await request.response.close();
              } catch (e, stack) {
                print('POST /api/upload - Upload error: $e');
                print('POST /api/upload - Stack trace: $stack');
                request.response.statusCode = HttpStatus.internalServerError;
                request.response.headers.contentType = ContentType.json;
                request.response.write(
                  jsonEncode({
                    'success': false,
                    'error': 'Upload failed: ${e.toString()}',
                  }),
                );
                await request.response.close();
              }
            } else {
              print(
                'DEBUG: No handler found for ${request.method} ${request.uri.path}',
              );
              request.response.statusCode = HttpStatus.notFound;
              await request.response.close();
            }
          } catch (e, stackTrace) {
            await _logError(
              'Error handling request #$requestCount (${request.method} ${request.uri.path})',
              e,
              stackTrace,
            );
            print('Error handling request: $e');
            print('Stack trace: $stackTrace');
            try {
              request.response.statusCode = HttpStatus.internalServerError;
              request.response.headers.contentType = ContentType.json;
              request.response.write(
                jsonEncode({'error': 'Internal server error'}),
              );
              await request.response.close();
              await _logDebug(
                'Error response sent successfully for request #$requestCount',
              );
            } catch (responseError) {
              await _logError(
                'Error sending error response for request #$requestCount',
                responseError,
              );
              print('Error sending error response: $responseError');
            }
          }
        }
      } catch (serverLoopError, stackTrace) {
        await _logError(
          'CRITICAL: Server loop error after $requestCount requests',
          serverLoopError,
          stackTrace,
        );
        print('Server loop error: $serverLoopError');
        print('Stack trace: $stackTrace');

        // Check if server is still listening
        try {
          await _logInfo('Checking server status after loop error...');
          final testSocket = await Socket.connect(
            '127.0.0.1',
            serverPort,
            timeout: Duration(seconds: 5),
          );
          await testSocket.close();
          await _logInfo('Server is still listening on port $serverPort');
        } catch (connectError) {
          await _logError(
            'Server is no longer listening on port $serverPort',
            connectError,
          );
        }

        // Wait a bit before restarting the loop
        await Future.delayed(Duration(seconds: 1));
        await _logInfo('Restarting server loop after error...');
        print('Restarting server loop...');
      }
    }
  } catch (e, stackTrace) {
    await _logError('FATAL: Server error in main function', e, stackTrace);
    print('Fatal server error: $e');
    print('Stack trace: $stackTrace');

    // Try to close connection pool gracefully
    try {
      await _connectionPool.close();
      await _logInfo('Connection pool closed gracefully after fatal error');
    } catch (poolError) {
      await _logError(
        'Error closing connection pool after fatal error',
        poolError,
      );
    }

    // Don't exit the process, just log the error and continue
    await _logInfo('Server will continue running despite the fatal error');
    print('Server will continue running despite the error');
  }
}

// Helper function to find the end of headers in multipart data
int _findHeaderEnd(List<int> bytes) {
  // Look for \r\n\r\n sequence
  for (int i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] == 13 &&
        bytes[i + 1] == 10 &&
        bytes[i + 2] == 13 &&
        bytes[i + 3] == 10) {
      return i;
    }
  }
  return -1;
}
