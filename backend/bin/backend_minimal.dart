import 'dart:convert';
import 'dart:io';

void main() async {
  print('Minimal backend starting...');

  final server = await HttpServer.bind(InternetAddress.anyIPv4, 8081);
  print('Minimal backend running on http://localhost:8081');

  await for (HttpRequest request in server) {
    try {
      print('DEBUG: Request received: ${request.method} ${request.uri.path}');

      // Add CORS headers
      request.response.headers.add(
        'Access-Control-Allow-Origin',
        'http://localhost:3000',
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

      // Simple response for /api/maps
      if (request.uri.path == '/api/maps') {
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'success': true, 'maps': []}));
        await request.response.close();
      } else {
        request.response.statusCode = HttpStatus.notFound;
        request.response.write('Not found');
        await request.response.close();
      }
    } catch (e, stackTrace) {
      print('Error handling request: $e');
      print('Stack trace: $stackTrace');
      try {
        request.response.statusCode = HttpStatus.internalServerError;
        request.response.write('Internal server error');
        await request.response.close();
      } catch (responseError) {
        print('Error sending error response: $responseError');
      }
    }
  }
}
