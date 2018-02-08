import {
  Tracer,
  BatchRecorder,
  ExplicitContext,
  Instrumentation,
  jsonEncoder
} from 'zipkin'
import {HttpLogger} from 'zipkin-transport-http'

const ZIPKIN_URL = window.location.protocol + '//' + window.location.host + '/zipkin'
/**
* Tracing plugin that uses Zipkin. Initiates new traces with outgoing requests
* and injects appropriate headers.
*/
export default {

  /**
   * Install the Auth class.
   *
   * Creates a Vue-resource http interceptor to handle automatically adding auth headers
   * and refreshing tokens. Then attaches this object to the global Vue (as Vue.auth).
   *
   * @param {Object} Vue The global Vue.
   * @param {Object} options Any options we want to have in our plugin.
   * @return {void}
   */
  install (Vue, options) {
    const serviceName = 'frontend'
    const tracer = new Tracer({
      ctxImpl: new ExplicitContext(),
      recorder: new BatchRecorder({
        logger: new HttpLogger({
          endpoint: ZIPKIN_URL,
          jsonEncoder: jsonEncoder.JSON_V2
        })
      }),
      localServiceName: 'frontend'
    })

    const instrumentation = new Instrumentation.HttpClient({tracer, serviceName})
    Vue.http.interceptors.push((request, next) => {
      tracer.scoped(() => {
        const options = instrumentation.recordRequest({}, request.url, request.method)
        for (var key in options.headers) {
          if (options.headers.hasOwnProperty(key)) {
            request.headers.set(key, options.headers[key])
          }
        }
        const traceId = tracer.id
        next(function (response) {
          tracer.scoped(() => {
            instrumentation.recordResponse(traceId, response.status)
          })
        })
      })
    })
  }
}
