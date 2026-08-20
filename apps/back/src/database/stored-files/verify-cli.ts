import 'dotenv/config';
import { main } from './cli';

if (require.main === module) {
  void main('verify');
}
